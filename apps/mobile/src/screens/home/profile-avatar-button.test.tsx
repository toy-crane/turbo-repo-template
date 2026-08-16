import { beforeEach, expect, jest, test } from "@jest/globals";
import { QueryClientProvider } from "@tanstack/react-query";
import { screen, userEvent, waitFor } from "@testing-library/react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import {
  createFakeSession,
  createProfileRow,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";
import {
  createTestQueryClient,
  renderWithHeroUI,
} from "@/shared/test/render-with-heroui";
import { ProfileAvatarButton } from "./profile-avatar-button";

jest.mock("@/features/auth/state/auth-session", () => ({
  useAuthSession: jest.fn(),
}));

jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("@/shared/test/fake-supabase") as typeof import("@/shared/test/fake-supabase")
    ).getFakeSupabase().client,
}));

const mockUseAuthSession = jest.mocked(useAuthSession);

function signedIn() {
  mockUseAuthSession.mockReturnValue({
    session: createFakeSession(),
    status: "signedIn",
  });
}

function renderButton(onPress: () => void) {
  return renderWithHeroUI(
    <QueryClientProvider client={createTestQueryClient()}>
      <ProfileAvatarButton onPress={onPress} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  signedIn();
});

test("프로필 이름의 첫 글자를 아바타에 보여준다", async () => {
  resetFakeSupabase({
    profile: createProfileRow({ display_name: "루비", username: "ruby" }),
    session: createFakeSession(),
  });

  await renderButton(() => {
    // The press is not what this test checks.
  });

  await waitFor(() => {
    expect(screen.getByText("루")).toBeOnTheScreen();
  });
});

test("로그인 전에는 프로필을 읽지 않는다", async () => {
  const fake = resetFakeSupabase();

  mockUseAuthSession.mockReturnValue({ session: null, status: "signedOut" });

  await renderButton(() => {
    // The press is not what this test checks.
  });

  expect(fake.from).not.toHaveBeenCalled();
});

test("아바타를 누르면 Settings 진입 동작을 실행한다", async () => {
  resetFakeSupabase({ session: createFakeSession() });

  const onPress = jest.fn();
  const user = userEvent.setup();

  await renderButton(onPress);

  await user.press(screen.getByRole("button", { name: "Open settings" }));

  expect(onPress).toHaveBeenCalledTimes(1);
});
