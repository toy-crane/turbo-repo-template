import { beforeEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import {
  type FakeSupabase,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { SignInEmailScreen } from "./sign-in-email-screen";

// The screen asks the native stack when its own transition ends so it can put
// the caret in the field. These tests render it outside a navigator, so the
// event source is stood in for and never reports an arrival.
jest.mock("expo-router", () => ({
  ...(jest.requireActual("expo-router") as object),
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("@/shared/test/fake-supabase") as typeof import("@/shared/test/fake-supabase")
    ).getFakeSupabase().client,
}));

const EMAIL = "reader@example.test";

let fake: FakeSupabase;
let onSent: jest.Mock<(email: string) => void>;

/**
 * React flushes a state update after the event returns, so a press that reads
 * state written by the previous line has to wait for that flush. Without this,
 * pressing right after typing sees the old value.
 */
async function type(label: string, text: string) {
  await act(() => {
    fireEvent.changeText(screen.getByLabelText(label), text);
  });
}

async function press(label: string) {
  await act(() => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

function renderEmail() {
  return renderWithHeroUI(<SignInEmailScreen onSent={onSent} />);
}

beforeEach(() => {
  onSent = jest.fn<(email: string) => void>();
  fake = resetFakeSupabase();
});

test("주소를 보내면 정규화한 주소로 다음 화면에 넘긴다", async () => {
  await renderEmail();

  await type("이메일", `  ${EMAIL.toUpperCase()} `);
  await press("인증 코드 받기");

  await waitFor(() => {
    expect(onSent).toHaveBeenCalledWith(EMAIL);
  });

  expect(fake.auth.signInWithOtp).toHaveBeenCalledWith({
    email: EMAIL,
    options: { shouldCreateUser: true },
  });
});

test("주소가 비어 있으면 보낼 수 없다", async () => {
  await renderEmail();

  await press("인증 코드 받기");

  expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
  expect(onSent).not.toHaveBeenCalled();
  // Nothing was typed, so there is nothing to correct and nothing to say.
  expect(screen.queryByTestId("sign-in-error-email")).toBeNull();
});

test("형식이 잘못되면 보내지 않고 입력 옆에 알린다", async () => {
  await renderEmail();

  await type("이메일", "reader@example");
  await press("인증 코드 받기");

  expect(await screen.findByTestId("sign-in-error-email")).toBeOnTheScreen();
  expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
  expect(onSent).not.toHaveBeenCalled();
});

test("주소를 고치기 시작하면 오류를 지운다", async () => {
  await renderEmail();

  await type("이메일", "reader@example");
  await press("인증 코드 받기");

  expect(await screen.findByTestId("sign-in-error-email")).toBeOnTheScreen();

  await type("이메일", "reader@example.t");

  // Scolding someone who is already fixing it is the bug this guards against.
  expect(screen.queryByTestId("sign-in-error-email")).toBeNull();
});

test("보내지 못하면 다음 화면으로 넘어가지 않는다", async () => {
  fake.auth.signInWithOtp.mockResolvedValueOnce({
    data: { session: null, user: null },
    error: Object.assign(new Error("Network request failed"), {
      name: "AuthRetryableFetchError",
    }),
  } as never);

  await renderEmail();

  await type("이메일", EMAIL);
  await press("인증 코드 받기");

  expect(await screen.findByTestId("sign-in-error-email")).toBeOnTheScreen();
  expect(onSent).not.toHaveBeenCalled();
});

test("전송 한도에 걸려도 이미 받은 코드를 넣게 넘어간다", async () => {
  fake.auth.signInWithOtp.mockResolvedValueOnce({
    data: { session: null, user: null },
    error: Object.assign(new Error("email rate limit exceeded"), {
      code: "over_email_send_rate_limit",
      status: 429,
    }),
  } as never);

  await renderEmail();

  await type("이메일", EMAIL);
  await press("인증 코드 받기");

  // The code from the earlier send is still valid, so the input has to open.
  await waitFor(() => {
    expect(onSent).toHaveBeenCalledWith(EMAIL);
  });
});

test("코드를 보내는 동안 같은 버튼을 다시 실행하지 않는다", async () => {
  let release = () => {
    // Replaced by the pending implementation below.
  };

  fake.auth.signInWithOtp.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () =>
          resolve({ data: { session: null, user: null }, error: null });
      })
  );

  await renderEmail();

  await type("이메일", EMAIL);

  const submit = screen.getByLabelText("인증 코드 받기");
  // fireEvent starts its own async act, so use Pressable's test callback to
  // keep all three calls inside this one render frame.
  const pressSubmit =
    submit.props.onStartShouldSetResponder.testOnly_pressabilityConfig()
      .onPress;

  await act(() => {
    pressSubmit();
    pressSubmit();
    pressSubmit();
  });

  await act(async () => {
    release();
    await Promise.resolve();
  });

  expect(fake.auth.signInWithOtp).toHaveBeenCalledTimes(1);
  // The swallowed presses must not advance either: each one that slipped
  // through would push another code screen for a code that was never sent.
  await waitFor(() => {
    expect(onSent).toHaveBeenCalledTimes(1);
  });
});

test("전송 한도가 아닌 429는 넘어가지 않는다", async () => {
  fake.auth.signInWithOtp.mockResolvedValueOnce({
    data: { session: null, user: null },
    error: Object.assign(new Error("too many requests"), {
      code: "over_request_rate_limit",
      status: 429,
    }),
  } as never);

  await renderEmail();

  await type("이메일", EMAIL);
  await press("인증 코드 받기");

  // Only the email-send limit means a code is already in their inbox. The
  // project-wide limiter says nothing was sent, so claiming otherwise on the
  // next screen would leave them waiting for mail that never arrives.
  expect(await screen.findByTestId("sign-in-error-email")).toBeOnTheScreen();
  expect(onSent).not.toHaveBeenCalled();
});
