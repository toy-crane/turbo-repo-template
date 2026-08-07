import { expect, jest, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { Platform } from "react-native";

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
        Pressable,
        {
          accessibilityLabel: label,
          accessibilityRole: "switch",
          accessibilityState: { checked: value },
          testID,
        },
        label ? React.createElement(NativeText, null, label) : null
      ),
    Text: ({ children }: PropsWithChildren) =>
      React.createElement(NativeText, null, children),
  };
});

test("Android 설정 스위치가 기본 label 행으로 각 항목을 한 번 표시한다", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "android");

  try {
    await render(<SettingsScreen />);

    expect(screen.getAllByText("Notifications")).toHaveLength(1);
    expect(screen.getAllByText("Haptics")).toHaveLength(1);
    expect(
      screen.getByRole("switch", { name: "Notifications" }).props
        .accessibilityState
    ).toEqual({ checked: false });
    expect(
      screen.getByRole("switch", { name: "Haptics" }).props.accessibilityState
    ).toEqual({ checked: true });
  } finally {
    platform.restore();
  }
});

test("플로팅 탭 바 아래로 마지막 설정 행을 스크롤할 여백을 확보한다", async () => {
  await render(<SettingsScreen />);

  expect(screen.getByTestId("settings-field-group")).toHaveStyle({
    paddingBottom: 132,
  });
});
