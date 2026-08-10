import { expect, jest, test } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthSessionProvider, useAuthSession } from "./auth-session";

const PROBLEM = "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL.";

// Lives in its own file because the whole point is a client that cannot be
// built at all, which the shared fake in the sibling suite always can.
jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: () => {
    throw new Error(
      "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL."
    );
  },
}));

function Status() {
  const { problem, status } = useAuthSession();

  return <Text>{`${status}:${problem ?? ""}`}</Text>;
}

test("설정이 없으면 로그아웃이 아니라 설정 오류로 구분한다", async () => {
  render(
    <AuthSessionProvider>
      <Status />
    </AuthSessionProvider>
  );

  // Reporting "signed out" here would send someone to a sign-in screen whose
  // credentials cannot reach anything, so the two states have to stay apart.
  await waitFor(() => {
    expect(screen.getByText(`misconfigured:${PROBLEM}`)).toBeOnTheScreen();
  });
});
