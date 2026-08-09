import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { signInAsync } from "expo-apple-authentication";
import { Platform } from "react-native";
import {
  GoogleOneTapSignIn,
  type OneTapResponse,
} from "react-native-nitro-google-signin";

import { AppQueryProvider } from "../../query/app-query-provider";
import { type FakeSupabase, resetFakeSupabase } from "../../test/fake-supabase";
import { renderWithHeroUI } from "../../test/render-with-heroui";
import { SignInScreen } from "./sign-in-screen";

jest.mock("../../supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("../../test/fake-supabase") as typeof import("../../test/fake-supabase")
    ).getFakeSupabase().client,
}));

const EMAIL = "reader@example.test";
const CODE = "048860";

const googleSuccess = {
  data: {
    idToken: "google-id-token",
    scopes: [],
    serverAuthCode: null,
    user: {
      email: EMAIL,
      familyName: null,
      givenName: null,
      id: "google-1",
      name: "Reader",
      photo: "https://example.test/reader.png",
    },
  },
  type: "success",
} as unknown as OneTapResponse;

const googleCancelled = {
  data: null,
  type: "cancelled",
} as unknown as OneTapResponse;

const googleNoCredential = {
  data: null,
  type: "noSavedCredentialFound",
} as unknown as OneTapResponse;

const appleCredential = {
  authorizationCode: null,
  email: null,
  fullName: { familyName: "Kim", givenName: "Reader" },
  identityToken: "apple-id-token",
  user: "apple-user-1",
};

const appleCancelled = Object.assign(
  new Error("The user canceled the authorization attempt"),
  { code: "ERR_REQUEST_CANCELED" }
);

const resendAgainMessage = /다시 받아/;
const missingWebClientIdMessage = /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/;
const invalidIdTokenMessage = /Invalid ID token/;
const hexNonce = /^[0-9a-f]{64}$/;
const noGoogleAccountMessage = /Google 계정이 있는지/;
const alreadySentMessage = /이미 보낸 코드를 입력해 주세요/;

const originalEnv = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

let fake: FakeSupabase;

/**
 * Hashes with Node rather than the app's own helper, so the assertion holds the
 * providers to the contract instead of to whatever the app happens to do.
 */
function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

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

function renderSignIn() {
  return renderWithHeroUI(
    <AppQueryProvider>
      <SignInScreen />
    </AppQueryProvider>
  );
}

async function reachCodeStep() {
  await renderSignIn();

  await type("이메일", EMAIL);
  await press("이메일로 계속하기");

  return await screen.findByLabelText("인증 코드");
}

beforeEach(() => {
  // The provider stand-ins live in jest.setup and are shared across tests, so
  // each test starts by clearing what the previous one recorded.
  jest.mocked(GoogleOneTapSignIn.configure).mockClear();
  jest
    .mocked(GoogleOneTapSignIn.presentExplicitSignIn)
    .mockReset()
    .mockResolvedValue(googleSuccess);
  jest.mocked(GoogleOneTapSignIn.checkPlayServices).mockClear();
  jest.mocked(GoogleOneTapSignIn.signIn).mockReset();
  jest.mocked(GoogleOneTapSignIn.createAccount).mockReset();
  jest
    .mocked(signInAsync)
    .mockReset()
    .mockRejectedValue(new Error("signInAsync is not stubbed for this test"));
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
    "web.apps.googleusercontent.com";
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID =
    "ios.apps.googleusercontent.com";
  fake = resetFakeSupabase();
});

afterEach(() => {
  if (originalEnv.web === undefined) {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  } else {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalEnv.web;
  }

  if (originalEnv.ios === undefined) {
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  } else {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = originalEnv.ios;
  }
});

test("이메일을 제출하면 같은 흐름 안에서 코드 입력으로 넘어간다", async () => {
  await reachCodeStep();

  expect(fake.auth.signInWithOtp).toHaveBeenCalledWith({
    email: EMAIL,
    options: { shouldCreateUser: true },
  });
  expect(screen.getByLabelText("인증 코드")).toBeOnTheScreen();
  expect(screen.queryByLabelText("이메일")).toBeNull();
});

test("이메일 형식이 잘못되면 보내지 않고 입력 옆에 알린다", async () => {
  await renderSignIn();

  await type("이메일", "reader");
  await press("이메일로 계속하기");

  expect(await screen.findByTestId("sign-in-error-email")).toBeOnTheScreen();
  expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
});

test("여섯 자리를 채우면 코드를 확인한다", async () => {
  await reachCodeStep();

  await type("인증 코드", CODE);

  await waitFor(() => {
    expect(fake.auth.verifyOtp).toHaveBeenCalledWith({
      email: EMAIL,
      token: CODE,
      type: "email",
    });
  });
});

test("맞지 않는 코드는 다시 받으라고 알리고 다시 시도할 수 있다", async () => {
  await reachCodeStep();

  fake.auth.verifyOtp.mockResolvedValueOnce({
    data: { session: null, user: null },
    error: Object.assign(new Error("Token has expired or is invalid"), {
      code: "otp_expired",
    }),
  } as never);

  await type("인증 코드", CODE);

  const message = await screen.findByTestId("sign-in-error-code");

  expect(message).toHaveTextContent(resendAgainMessage);

  // The screen is usable again: the confirm button is no longer stuck pending.
  await press("코드 확인");

  await waitFor(() => {
    expect(fake.auth.verifyOtp).toHaveBeenCalledTimes(2);
  });
});

test("코드 다시 받기는 대기 시간이 끝나야 누를 수 있다", async () => {
  jest.useFakeTimers();

  try {
    await reachCodeStep();

    const resend = screen.getByLabelText("코드 다시 받기");

    expect(resend).toHaveTextContent("60초 뒤에 코드 다시 받기");

    await press("코드 다시 받기");

    expect(fake.auth.signInWithOtp).toHaveBeenCalledTimes(1);

    await act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getByLabelText("코드 다시 받기")).toHaveTextContent(
      "코드 다시 받기"
    );

    await press("코드 다시 받기");

    await waitFor(() => {
      expect(fake.auth.signInWithOtp).toHaveBeenCalledTimes(2);
    });
  } finally {
    jest.useRealTimers();
  }
});

test("전송 한도에 걸려도 이미 받은 코드를 넣을 수 있게 한다", async () => {
  fake.auth.signInWithOtp.mockResolvedValueOnce({
    data: { session: null, user: null },
    error: Object.assign(new Error("email rate limit exceeded"), {
      code: "over_email_send_rate_limit",
      status: 429,
    }),
  } as never);

  await renderSignIn();

  await type("이메일", EMAIL);
  await press("이메일로 계속하기");

  // The code from the earlier send is still valid, so the input has to open.
  expect(await screen.findByLabelText("인증 코드")).toBeOnTheScreen();
  expect(await screen.findByTestId("sign-in-error-code")).toHaveTextContent(
    alreadySentMessage
  );
});

test("다시 받기가 전송 한도에 걸리면 대기 시간을 다시 건다", async () => {
  jest.useFakeTimers();

  try {
    await reachCodeStep();

    await act(() => {
      jest.advanceTimersByTime(60_000);
    });

    fake.auth.signInWithOtp.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: Object.assign(new Error("email rate limit exceeded"), {
        status: 429,
      }),
    } as never);

    await press("코드 다시 받기");

    // Without a fresh countdown the button would stay open and invite another
    // rejected request straight away.
    expect(screen.getByLabelText("코드 다시 받기")).toHaveTextContent(
      "60초 뒤에 코드 다시 받기"
    );
  } finally {
    jest.useRealTimers();
  }
});

test("다른 이메일을 쓰겠다고 하면 첫 단계로 돌아간다", async () => {
  await reachCodeStep();

  await press("다른 이메일 사용");

  expect(await screen.findByLabelText("이메일")).toBeOnTheScreen();
  expect(screen.queryByLabelText("인증 코드")).toBeNull();
});

test("Google 로그인은 시도마다 새 nonce를 만들고 원본을 Supabase에 넘긴다", async () => {
  await renderSignIn();

  await press("Google로 계속하기");

  await waitFor(() => {
    expect(fake.auth.signInWithIdToken).toHaveBeenCalled();
  });

  const configured = jest.mocked(GoogleOneTapSignIn.configure).mock
    .calls[0]?.[0];
  const sent = jest.mocked(fake.auth.signInWithIdToken).mock.calls[0]?.[0] as {
    nonce?: string;
    provider?: string;
    token?: string;
  };

  expect(sent.provider).toBe("google");
  expect(sent.token).toBe("google-id-token");
  // Google gets the hash of exactly what Supabase gets. Asserting the relation,
  // not just that the two differ: both values are 64 hex characters, so a swap
  // would satisfy any weaker check while breaking every real sign-in.
  expect(sent.nonce).toMatch(hexNonce);
  expect(sha256Hex(sent.nonce as string)).toBe(configured?.nonce);
});

test("제공자 이름과 이미지는 비어 있는 프로필 값만 채운다", async () => {
  await renderSignIn();

  await press("Google로 계속하기");

  await waitFor(() => {
    expect(fake.updates).toHaveLength(2);
  });

  expect(fake.updates[0]?.values).toEqual({ display_name: "Reader" });
  expect(fake.updates[0]?.filters).toContainEqual({
    column: "display_name",
    operator: "is",
    value: null,
  });
  expect(fake.updates[1]?.values).toEqual({
    avatar_url: "https://example.test/reader.png",
  });
  expect(fake.updates[1]?.filters).toContainEqual({
    column: "avatar_url",
    operator: "is",
    value: null,
  });
});

test("Google 계정 선택을 취소하면 오류를 띄우지 않는다", async () => {
  jest
    .mocked(GoogleOneTapSignIn.presentExplicitSignIn)
    .mockResolvedValueOnce(googleCancelled);

  await renderSignIn();

  await press("Google로 계속하기");

  await waitFor(() => {
    expect(GoogleOneTapSignIn.presentExplicitSignIn).toHaveBeenCalled();
  });

  expect(screen.queryByTestId("sign-in-error-provider")).toBeNull();
  expect(screen.getByLabelText("Google로 계속하기")).toBeOnTheScreen();
});

test("Apple 로그인은 해시 nonce를 Apple에, 원본을 Supabase에 넘긴다", async () => {
  jest.mocked(signInAsync).mockResolvedValueOnce(appleCredential as never);

  await renderSignIn();

  await press("Apple로 계속하기");

  await waitFor(() => {
    expect(fake.auth.signInWithIdToken).toHaveBeenCalled();
  });

  const requested = jest.mocked(signInAsync).mock.calls[0]?.[0];
  const sent = jest.mocked(fake.auth.signInWithIdToken).mock.calls[0]?.[0] as {
    nonce?: string;
    provider?: string;
    token?: string;
  };

  expect(sent.provider).toBe("apple");
  expect(sent.token).toBe("apple-id-token");
  expect(sent.nonce).toMatch(hexNonce);
  expect(sha256Hex(sent.nonce as string)).toBe(requested?.nonce);
  // Apple hands the name over on the first approval only, so it is used at once.
  expect(fake.updates[0]?.values).toEqual({ display_name: "Reader Kim" });
});

test("Apple 로그인을 취소하면 오류를 띄우지 않는다", async () => {
  jest.mocked(signInAsync).mockRejectedValueOnce(appleCancelled);

  await renderSignIn();

  await press("Apple로 계속하기");

  await waitFor(() => {
    expect(signInAsync).toHaveBeenCalled();
  });

  expect(screen.queryByTestId("sign-in-error-provider")).toBeNull();
  expect(fake.auth.signInWithIdToken).not.toHaveBeenCalled();
});

test("Google이 자격 정보를 찾지 못하면 취소와 달리 안내를 보여준다", async () => {
  jest
    .mocked(GoogleOneTapSignIn.presentExplicitSignIn)
    .mockResolvedValueOnce(googleNoCredential);

  await renderSignIn();

  await press("Google로 계속하기");

  expect(await screen.findByTestId("sign-in-error-provider")).toHaveTextContent(
    noGoogleAccountMessage
  );
  expect(fake.auth.signInWithIdToken).not.toHaveBeenCalled();
});

test("Android는 자격 정보를 찾을 때까지 계정 목록을 넓혀 간다", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "android");

  try {
    jest
      .mocked(GoogleOneTapSignIn.signIn)
      .mockResolvedValueOnce(googleNoCredential);
    jest
      .mocked(GoogleOneTapSignIn.createAccount)
      .mockResolvedValueOnce(googleNoCredential);

    await renderSignIn();

    await press("Google로 계속하기");

    await waitFor(() => {
      expect(fake.auth.signInWithIdToken).toHaveBeenCalled();
    });

    expect(GoogleOneTapSignIn.checkPlayServices).toHaveBeenCalled();
    expect(GoogleOneTapSignIn.signIn).toHaveBeenCalled();
    expect(GoogleOneTapSignIn.createAccount).toHaveBeenCalled();
  } finally {
    platform.restore();
  }
});

test("Google 설정이 없으면 설정 오류로 구분해 알린다", async () => {
  delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  await renderSignIn();

  await press("Google로 계속하기");

  const message = await screen.findByTestId("sign-in-error-provider");

  expect(message).toHaveTextContent(missingWebClientIdMessage);
  expect(GoogleOneTapSignIn.presentExplicitSignIn).not.toHaveBeenCalled();
});

test("Supabase 검증이 실패해도 버튼이 진행 상태에 남지 않는다", async () => {
  fake.auth.signInWithIdToken.mockResolvedValueOnce({
    data: { session: null, user: null },
    error: new Error("Invalid ID token"),
  } as never);

  await renderSignIn();

  await press("Google로 계속하기");

  expect(await screen.findByTestId("sign-in-error-provider")).toHaveTextContent(
    invalidIdTokenMessage
  );

  await press("Google로 계속하기");

  await waitFor(() => {
    expect(GoogleOneTapSignIn.presentExplicitSignIn).toHaveBeenCalledTimes(2);
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

  await renderSignIn();

  await type("이메일", EMAIL);

  const submit = screen.getByLabelText("이메일로 계속하기");

  // All three inside one act, so React never re-renders between them. That is
  // the impatient tap this guards against.
  await act(() => {
    fireEvent.press(submit);
    fireEvent.press(submit);
    fireEvent.press(submit);
  });

  await act(() => {
    release();
  });

  expect(fake.auth.signInWithOtp).toHaveBeenCalledTimes(1);
});

test("Apple 버튼은 iOS에서만 보여준다", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "android");

  try {
    await renderSignIn();

    expect(screen.queryByLabelText("Apple로 계속하기")).toBeNull();
    expect(screen.getByLabelText("Google로 계속하기")).toBeOnTheScreen();
  } finally {
    platform.restore();
  }
});

test("Apple 버튼은 iOS 로그인 화면에 있다", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "ios");

  try {
    await renderSignIn();

    expect(screen.getByLabelText("Apple로 계속하기")).toBeOnTheScreen();
  } finally {
    platform.restore();
  }
});
