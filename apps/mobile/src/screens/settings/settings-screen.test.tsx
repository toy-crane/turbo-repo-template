import { beforeEach, expect, jest, test } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { Platform } from "react-native";

import {
  createFakeSession,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";
import { SettingsScreen } from "./settings-screen";

/** The foreground colour the root layout would hand this screen. */
const FOREGROUND = "#111114";

jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("@/shared/test/fake-supabase") as typeof import("@/shared/test/fake-supabase")
    ).getFakeSupabase().client,
}));

jest.mock("@expo/ui", () => {
  const React = require("react") as typeof import("react");
  const {
    Pressable,
    Text: NativeText,
    View,
  } = require("react-native") as typeof import("react-native");
  const Container = ({
    children,
    style,
    testID,
  }: PropsWithChildren<{
    style?: import("react-native").ViewStyle;
    testID?: string;
  }>) => React.createElement(View, { style, testID }, children);
  const FieldGroup = Object.assign(Container, { Section: Container });

  return {
    FieldGroup,
    Host: Container,
    // A native list row takes a press anywhere across it and reads its own text
    // as its accessible name, so the stand-in does the same.
    ListItem: ({
      children,
      onPress,
      testID,
    }: PropsWithChildren<{ onPress?: () => void; testID?: string }>) =>
      React.createElement(
        Pressable,
        { accessibilityRole: "button", onPress, testID },
        children
      ),
    Row: Container,
    Spacer: Container,
    Switch: ({
      label,
      testID,
      value,
    }: {
      label?: string;
      testID: string;
      value: boolean;
    }) =>
      React.createElement(
        View,
        null,
        label ? React.createElement(NativeText, null, label) : null,
        React.createElement(Pressable, {
          accessibilityRole: "switch",
          accessibilityState: { checked: value },
          testID,
        })
      ),
    Text: ({
      children,
      textStyle,
    }: PropsWithChildren<{ textStyle?: import("react-native").TextStyle }>) =>
      React.createElement(NativeText, { style: textStyle }, children),
  };
});

beforeEach(() => {
  resetFakeSupabase({ session: createFakeSession() });
});

function renderSettings(queryClient: QueryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsScreen foreground={FOREGROUND} />
    </QueryClientProvider>
  );
}

test("로그아웃은 현재 기기 세션만 끝낸다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });

  await renderSettings();

  fireEvent.press(screen.getByRole("button", { name: "로그아웃" }));

  await waitFor(() => {
    expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});

test("로그아웃이 끝나기 전에는 같은 버튼을 다시 실행하지 않는다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });
  let release = () => {
    // Replaced by the pending implementation below.
  };

  fake.auth.signOut.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => resolve({ error: null });
      })
  );

  await renderSettings();

  await act(() => {
    fireEvent.press(screen.getByRole("button", { name: "로그아웃" }));
  });

  const pending = await screen.findByRole("button", { name: "로그아웃 중" });

  await act(() => {
    fireEvent.press(pending);
    fireEvent.press(pending);
  });

  await act(() => {
    release();
  });

  expect(fake.auth.signOut).toHaveBeenCalledTimes(1);
});

test("로그아웃이 실패해도 이전 사용자의 캐시는 남기지 않는다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });
  const queryClient = new QueryClient();

  fake.auth.signOut.mockResolvedValueOnce({
    error: new Error("Network request failed"),
  } as never);

  await renderSettings(queryClient);

  queryClient.setQueryData(["notes"], ["이전 사용자의 데이터"]);

  await act(() => {
    fireEvent.press(screen.getByRole("button", { name: "로그아웃" }));
  });

  // The cache is emptied whatever else failed, so the next person to sign in on
  // this device cannot read what the previous one left behind.
  await waitFor(() => {
    expect(queryClient.getQueryData(["notes"])).toBeUndefined();
  });

  expect(await screen.findByTestId("sign-out-error")).toBeOnTheScreen();
});

test("iOS 설정 텍스트는 네이티브 기본 색상을 그대로 쓴다", async () => {
  await renderSettings();

  expect(screen.getByText("Version").props.style).toBeUndefined();
});

test("Android 설정 스위치가 기본 label 행으로 각 항목을 한 번 표시한다", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "android");

  try {
    await renderSettings();

    expect(screen.getAllByText("Notifications")).toHaveLength(1);
    expect(screen.getAllByText("Haptics")).toHaveLength(1);
    // Android's @expo/ui text does not follow the app's appearance on its own,
    // so the screen has to hand it the same foreground colour.
    expect(screen.getByText("Version")).toHaveStyle({ color: FOREGROUND });
    expect(screen.getByTestId("preferences-section")).toHaveStyle({
      paddingTop: 24,
    });
    expect(
      screen.getByTestId("notifications-switch").props.accessibilityState
    ).toEqual({ checked: false });
    expect(
      screen.getByTestId("haptics-switch").props.accessibilityState
    ).toEqual({
      checked: true,
    });
  } finally {
    platform.restore();
  }
});
