import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import {
  act,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import { queryClient } from "@/core/providers/query-provider";
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

// The tab screens pull in native UI this test does not need; the route names
// are what it checks.
jest.mock("@/screens/home/home-screen", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    HomeScreen: () =>
      React.createElement(View, { accessibilityLabel: "Home placeholder" }),
  };
});

beforeEach(() => {
  queryClient.clear();
  resetFakeSupabase();
});

afterEach(async () => {
  await queryClient.cancelQueries();
  queryClient.clear();
});

test("저장된 세션을 읽는 동안에는 로그인 화면도 앱 화면도 보여주지 않는다", async () => {
  const fake = resetFakeSupabase({
    holdSession: true,
    session: createFakeSession(),
  });

  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  expect(screen.getByLabelText("로그인 상태 확인 중")).toBeOnTheScreen();
  expect(screen.queryByLabelText("Google로 계속하기")).toBeNull();
  expect(screen.queryByLabelText("Home placeholder")).toBeNull();

  await act(() => {
    fake.settleSession();
  });

  await waitFor(() => {
    expect(screen.getByLabelText("Home placeholder")).toBeOnTheScreen();
  });
});

test("유효한 세션이 있으면 로그인 화면 없이 앱 화면을 연다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });
  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  await waitFor(() => {
    expect(screen.getByLabelText("Home placeholder")).toBeOnTheScreen();
  });

  expect(router.getPathname()).toBe("/");
  // Restoring a session must not reopen a provider's account UI.
  expect(fake.auth.signInWithIdToken).not.toHaveBeenCalled();
});

test("세션이 없으면 로그인 화면을 연다", async () => {
  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  await waitFor(() => {
    expect(screen.getByLabelText("Google로 계속하기")).toBeOnTheScreen();
  });

  expect(router.getPathname()).toBe("/sign-in");
  expect(screen.queryByLabelText("Home placeholder")).toBeNull();
});

test("읽을 수 없는 저장값은 로그인 상태로 보지 않고 로컬 세션을 지운다", async () => {
  const fake = resetFakeSupabase({
    sessionError: new Error("Invalid Refresh Token"),
  });

  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  await waitFor(() => {
    expect(screen.getByLabelText("Google로 계속하기")).toBeOnTheScreen();
  });

  expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
});

test("네트워크 때문에 확인하지 못한 세션은 지우지 않는다", async () => {
  const fake = resetFakeSupabase({
    sessionError: Object.assign(new Error("Failed to fetch"), {
      name: "AuthRetryableFetchError",
    }),
  });

  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  await waitFor(() => {
    expect(screen.getByLabelText("Google로 계속하기")).toBeOnTheScreen();
  });

  // The refresh token is still good; throwing it away would make an offline
  // launch cost the person a new sign-in.
  expect(fake.auth.signOut).not.toHaveBeenCalled();
});

test("세션이 끝나면 보호 화면을 닫고 로그인 화면으로 보낸다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });
  const router = renderRouter("./app", { initialUrl: "/" });
  await router;

  await waitFor(() => {
    expect(screen.getByLabelText("Home placeholder")).toBeOnTheScreen();
  });

  await act(() => {
    fake.emit(null);
  });

  await waitFor(() => {
    expect(router.getPathname()).toBe("/sign-in");
  });

  expect(screen.queryByLabelText("Home placeholder")).toBeNull();
});
