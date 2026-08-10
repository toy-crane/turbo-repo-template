import { beforeEach, expect, jest, test } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { AppState, type AppStateStatus, Text } from "react-native";

import {
  createFakeSession,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";
import { AuthSessionProvider } from "./auth-session";

jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("@/shared/test/fake-supabase") as typeof import("@/shared/test/fake-supabase")
    ).getFakeSupabase().client,
}));

beforeEach(() => {
  resetFakeSupabase({ session: createFakeSession() });
});

function provider(): ReactElement {
  return (
    <AuthSessionProvider>
      <Text>app</Text>
    </AuthSessionProvider>
  );
}

/**
 * Captures the AppState listener the provider registers, so a test can move the
 * app between foreground and background without a real device.
 *
 * The original function is put back by hand rather than through mockRestore():
 * the test preset already supplies AppState as a mock, and restoring a spy over
 * one leaves it without its implementation for the rest of the file.
 */
function captureAppStateListener() {
  const original = AppState.addEventListener;
  let listener: ((state: AppStateStatus) => void) | undefined;

  AppState.addEventListener = ((
    _type: string,
    handler: (state: AppStateStatus) => void
  ) => {
    listener = handler;

    return { remove: () => undefined };
  }) as typeof AppState.addEventListener;

  return {
    restore: () => {
      AppState.addEventListener = original;
    },
    send: (state: AppStateStatus) => listener?.(state),
  };
}

test("앱을 열면 세션 자동 갱신을 시작한다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });

  await render(provider());

  expect(screen.getByText("app")).toBeOnTheScreen();
  expect(fake.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
});

test("앱이 뒤로 물러나면 갱신을 멈추고 돌아오면 다시 시작한다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });
  const appState = captureAppStateListener();

  try {
    await render(provider());

    await act(() => {
      appState.send("background");
    });

    expect(fake.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);

    await act(() => {
      appState.send("active");
    });

    expect(fake.auth.startAutoRefresh).toHaveBeenCalledTimes(2);
  } finally {
    appState.restore();
  }
});

test("화면을 내리면 갱신 ticker를 남기지 않는다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });
  const view = await render(provider());

  await view.unmount();

  expect(fake.auth.stopAutoRefresh).toHaveBeenCalled();
});
