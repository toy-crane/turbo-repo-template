import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent } from "@testing-library/react-native";
import { router as expoRouter } from "expo-router";
import {
  act,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import { createFakeSession, resetFakeSupabase } from "../test/fake-supabase";

// Home now talks to the AI API, so it is stubbed here like every other screen:
// these tests are about which route renders, not about what the screen does.
jest.mock("../features/home/home-screen", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    HomeScreen: () =>
      React.createElement(View, { accessibilityLabel: "Home placeholder" }),
  };
});

// Every route below the root layout is behind the session guard, so these tests
// start from a signed-in app. The guard itself is covered in auth-routing.test.
jest.mock("../supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("../test/fake-supabase") as typeof import("../test/fake-supabase")
    ).getFakeSupabase().client,
}));

beforeEach(() => {
  resetFakeSupabase({ session: createFakeSession() });
});

jest.mock("../features/activity/activity-screen", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    ActivityScreen: () =>
      React.createElement(View, { accessibilityLabel: "Activity placeholder" }),
  };
});

jest.mock("../features/settings/settings-screen", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    SettingsScreen: () =>
      React.createElement(View, { accessibilityLabel: "Settings placeholder" }),
  };
});

jest.mock("../features/saved/saved-screen", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    SavedScreen: () =>
      React.createElement(View, { accessibilityLabel: "Saved placeholder" }),
  };
});

test("/에서 Home 탭의 첫 화면을 표시한다", async () => {
  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  expect(router.getPathname()).toBe("/");
  expect(screen.getByLabelText("Home placeholder")).toBeOnTheScreen();
});

test("Home 이니셜 아바타가 Settings page sheet 경로를 연다", async () => {
  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  await act(() => {
    fireEvent.press(screen.getByRole("button", { name: "Open settings" }));
  });

  await waitFor(() => {
    expect(router.getPathname()).toBe("/settings");
    expect(screen.getByLabelText("Settings placeholder")).toBeOnTheScreen();
  });
});

test("공개 경로 이동이 각 네이티브 탭의 화면을 표시한다", async () => {
  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  await act(() => {
    expoRouter.navigate("/activity");
  });

  await waitFor(() => {
    expect(router.getPathname()).toBe("/activity");
    expect(screen.getByLabelText("Activity placeholder")).toBeOnTheScreen();
  });

  await act(() => {
    expoRouter.navigate("/saved");
  });

  await waitFor(() => {
    expect(router.getPathname()).toBe("/saved");
    expect(screen.getByLabelText("Saved placeholder")).toBeOnTheScreen();
  });

  await act(() => {
    expoRouter.navigate("/settings");
  });

  await waitFor(() => {
    expect(router.getPathname()).toBe("/settings");
    expect(screen.getByLabelText("Settings placeholder")).toBeOnTheScreen();
  });
});
