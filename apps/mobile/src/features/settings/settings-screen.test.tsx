import { expect, jest, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { Platform } from "react-native";

import { AppThemeBridge } from "../../theme/app-theme-bridge";
import { SettingsScreen } from "./settings-screen";

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
    Text: ({ children }: PropsWithChildren) =>
      React.createElement(NativeText, null, children),
  };
});

jest.mock("heroui-native/hooks", () => ({
  useThemeColor: () => ["#F4F4F6", "#111114", "#FFFFFF"],
}));

jest.mock("uniwind", () => ({
  useUniwind: () => ({ hasAdaptiveThemes: true, theme: "light" }),
}));

test("Android 설정 스위치가 기본 label 행으로 각 항목을 한 번 표시한다", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "android");

  try {
    await render(
      <AppThemeBridge>
        <SettingsScreen />
      </AppThemeBridge>
    );

    expect(screen.getAllByText("Notifications")).toHaveLength(1);
    expect(screen.getAllByText("Haptics")).toHaveLength(1);
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
