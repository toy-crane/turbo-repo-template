import { beforeEach, expect, jest, test } from "@jest/globals";
import { renderRouter, screen, waitFor } from "expo-router/testing-library";

import {
  createFakeSession,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";

jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("@/shared/test/fake-supabase") as typeof import("@/shared/test/fake-supabase")
    ).getFakeSupabase().client,
}));

beforeEach(() => {
  resetFakeSupabase({ session: createFakeSession() });
});

jest.mock("@/screens/home/home-screen", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");
  const { useQueryClient } =
    require("@tanstack/react-query") as typeof import("@tanstack/react-query");

  return {
    HomeScreen: () => {
      useQueryClient();

      return React.createElement(View, {
        accessibilityLabel: "Query client reachable",
      });
    },
  };
});

test("root provider tree가 화면에 query client를 제공한다", async () => {
  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  // Opening the app waits for the session and then the profile, so the first
  // frame is deliberately neither screen.
  await waitFor(() => {
    expect(screen.getByLabelText("Query client reachable")).toBeOnTheScreen();
  });
});
