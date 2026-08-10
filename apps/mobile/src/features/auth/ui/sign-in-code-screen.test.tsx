import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import {
  type FakeSupabase,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { SignInCodeScreen } from "./sign-in-code-screen";

jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("@/shared/test/fake-supabase") as typeof import("@/shared/test/fake-supabase")
    ).getFakeSupabase().client,
}));

const EMAIL = "reader@example.test";
const CODE = "048860";

const wrongCode = {
  data: { session: null, user: null },
  error: Object.assign(new Error("Token has expired or is invalid"), {
    code: "otp_expired",
  }),
};

let fake: FakeSupabase;

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

function renderCode() {
  return renderWithHeroUI(<SignInCodeScreen email={EMAIL} />);
}

beforeEach(() => {
  fake = resetFakeSupabase();
});

afterEach(() => {
  jest.useRealTimers();
});

test("여섯 자리를 채우면 확인 버튼 없이 바로 확인한다", async () => {
  await renderCode();

  await type("인증 코드", CODE);

  await waitFor(() => {
    expect(fake.auth.verifyOtp).toHaveBeenCalledWith({
      email: EMAIL,
      token: CODE,
      type: "email",
    });
  });
});

test("다 채우기 전에는 확인하지 않는다", async () => {
  await renderCode();

  await type("인증 코드", "04886");

  expect(fake.auth.verifyOtp).not.toHaveBeenCalled();
});

test("숫자 사이에 다른 글자가 섞여도 코드만 남긴다", async () => {
  await renderCode();

  await type("인증 코드", "048-860");

  await waitFor(() => {
    expect(fake.auth.verifyOtp).toHaveBeenCalledWith({
      email: EMAIL,
      token: CODE,
      type: "email",
    });
  });
});

test("코드가 맞지 않으면 다시 입력하라고 알린다", async () => {
  fake.auth.verifyOtp.mockResolvedValueOnce(wrongCode as never);

  await renderCode();

  await type("인증 코드", CODE);

  expect(await screen.findByTestId("sign-in-error-code")).toHaveTextContent(
    "코드를 다시 입력해 주세요."
  );
});

test("코드가 맞지 않으면 칸을 비워 바로 다시 넣게 한다", async () => {
  fake.auth.verifyOtp.mockResolvedValueOnce(wrongCode as never);

  await renderCode();

  await type("인증 코드", CODE);

  await screen.findByTestId("sign-in-error-code");

  // Leaving the wrong digits behind would make the person delete six
  // characters before they could try again.
  expect(screen.getByLabelText("인증 코드")).toHaveProp("value", "");

  await type("인증 코드", CODE);

  await waitFor(() => {
    expect(fake.auth.verifyOtp).toHaveBeenCalledTimes(2);
  });
});

test("코드 다시 받기는 대기 시간이 끝나야 누를 수 있다", async () => {
  jest.useFakeTimers();

  await renderCode();

  const resend = screen.getByLabelText("코드 다시 받기");

  expect(resend).toHaveTextContent("60초 후 다시 받기");

  await press("코드 다시 받기");

  expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();

  await act(() => {
    jest.advanceTimersByTime(60_000);
  });

  expect(screen.getByLabelText("코드 다시 받기")).toHaveTextContent(
    "코드 다시 받기"
  );

  await press("코드 다시 받기");

  await waitFor(() => {
    expect(fake.auth.signInWithOtp).toHaveBeenCalledWith({
      email: EMAIL,
      options: { shouldCreateUser: true },
    });
  });
});

test("다시 받으면 대기 시간을 새로 건다", async () => {
  jest.useFakeTimers();

  await renderCode();

  await act(() => {
    jest.advanceTimersByTime(60_000);
  });

  await press("코드 다시 받기");

  // Without a fresh countdown the button would stay open and invite another
  // rejected request straight away.
  await waitFor(() => {
    expect(screen.getByLabelText("코드 다시 받기")).toHaveTextContent(
      "60초 후 다시 받기"
    );
  });
});

test("어디로 보냈는지 알려준다", async () => {
  await renderCode();

  expect(screen.getByText(`${EMAIL} 주소로 보냈어요.`)).toBeOnTheScreen();
});
