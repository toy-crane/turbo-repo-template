import { createHash } from "node:crypto";
import { beforeEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { signInAsync } from "expo-apple-authentication";
import { Platform } from "react-native";
import {
  GoogleOneTapSignIn,
  type OneTapResponse,
} from "react-native-nitro-google-signin";

import {
  type FakeSupabase,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { SignInMethodScreen } from "./sign-in-method-screen";

jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("@/shared/test/fake-supabase") as typeof import("@/shared/test/fake-supabase")
    ).getFakeSupabase().client,
}));

const EMAIL = "reader@example.test";

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

const invalidIdTokenMessage = /Invalid ID token/;
const hexNonce = /^[0-9a-f]{64}$/;
const noGoogleAccountMessage = /Google 계정이 있는지/;

let fake: FakeSupabase;
let chooseEmail: jest.Mock<() => void>;

/**
 * Hashes with Node rather than the app's own helper, so the assertion holds the
 * providers to the contract instead of to whatever the app happens to do.
 */
function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function press(label: string) {
  await act(() => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

function renderMethods() {
  return renderWithHeroUI(<SignInMethodScreen onChooseEmail={chooseEmail} />);
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
  chooseEmail = jest.fn<() => void>();
  fake = resetFakeSupabase();
});

test("이메일을 고르면 다음 화면으로 넘긴다", async () => {
  await renderMethods();

  await press("이메일로 계속하기");

  expect(chooseEmail).toHaveBeenCalledTimes(1);
  // The address itself belongs to the next screen, so this one asks for none.
  expect(screen.queryByLabelText("이메일")).toBeNull();
});

test("Google 로그인은 시도마다 새 nonce를 만들고 원본을 Supabase에 넘긴다", async () => {
  await renderMethods();

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
  await renderMethods();

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

  await renderMethods();

  await press("Google로 계속하기");

  await waitFor(() => {
    expect(GoogleOneTapSignIn.presentExplicitSignIn).toHaveBeenCalled();
  });

  expect(screen.queryByTestId("sign-in-error-provider")).toBeNull();
  expect(screen.getByLabelText("Google로 계속하기")).toBeOnTheScreen();
});

test("Apple 로그인은 해시 nonce를 Apple에, 원본을 Supabase에 넘긴다", async () => {
  jest.mocked(signInAsync).mockResolvedValueOnce(appleCredential as never);

  await renderMethods();

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

  await renderMethods();

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

  await renderMethods();

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

    await renderMethods();

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

test("Supabase 검증이 실패해도 버튼이 진행 상태에 남지 않는다", async () => {
  fake.auth.signInWithIdToken.mockResolvedValueOnce({
    data: { session: null, user: null },
    error: new Error("Invalid ID token"),
  } as never);

  await renderMethods();

  await press("Google로 계속하기");

  expect(await screen.findByTestId("sign-in-error-provider")).toHaveTextContent(
    invalidIdTokenMessage
  );

  await press("Google로 계속하기");

  await waitFor(() => {
    expect(GoogleOneTapSignIn.presentExplicitSignIn).toHaveBeenCalledTimes(2);
  });
});

test("로그인이 진행 중이면 같은 버튼을 다시 실행하지 않는다", async () => {
  let release = () => {
    // Replaced by the pending implementation below.
  };

  jest.mocked(GoogleOneTapSignIn.presentExplicitSignIn).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => resolve(googleSuccess);
      })
  );

  await renderMethods();

  const google = screen.getByLabelText("Google로 계속하기");
  // fireEvent starts its own async act, so use Pressable's test callback to
  // keep all three calls inside this one render frame.
  const pressGoogle =
    google.props.onStartShouldSetResponder.testOnly_pressabilityConfig()
      .onPress;
  let firstPress: Promise<unknown> | undefined;

  // All three inside one act, so React never re-renders between them. That is
  // the impatient tap this guards against.
  await act(() => {
    firstPress = pressGoogle();
    pressGoogle();
    pressGoogle();
  });

  await act(async () => {
    release();
    await firstPress;
  });

  expect(GoogleOneTapSignIn.presentExplicitSignIn).toHaveBeenCalledTimes(1);
});

test("Apple 버튼은 iOS에서만 보여준다", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "android");

  try {
    await renderMethods();

    expect(screen.queryByLabelText("Apple로 계속하기")).toBeNull();
    expect(screen.getByLabelText("Google로 계속하기")).toBeOnTheScreen();
  } finally {
    platform.restore();
  }
});

test("Apple 버튼은 iOS 로그인 화면에 있다", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "ios");

  try {
    await renderMethods();

    expect(screen.getByLabelText("Apple로 계속하기")).toBeOnTheScreen();
  } finally {
    platform.restore();
  }
});
