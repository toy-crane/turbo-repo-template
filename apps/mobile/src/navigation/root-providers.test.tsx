import { beforeEach, expect, jest, test } from "@jest/globals";
import { renderRouter, screen } from "expo-router/testing-library";

import { createFakeSession, resetFakeSupabase } from "../test/fake-supabase";

jest.mock("../supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("../test/fake-supabase") as typeof import("../test/fake-supabase")
    ).getFakeSupabase().client,
}));

beforeEach(() => {
  resetFakeSupabase({ session: createFakeSession() });
});

jest.mock("../features/home/home-screen", () => {
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

  expect(screen.getByLabelText("Query client reachable")).toBeOnTheScreen();
});
