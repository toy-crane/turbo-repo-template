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
  const Container = ({ children }: PropsWithChildren) =>
    React.createElement(View, null, children);
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
      React.createElement(Pressable, {
        accessibilityLabel: label,
        accessibilityRole: "switch",
        accessibilityState: { checked: value },
        testID,
      }),
    Text: ({ children }: PropsWithChildren) =>
      React.createElement(NativeText, null, children),
  };
});

test("Android 설정 스위치가 TalkBack에 각 항목의 이름을 제공한다", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "android");

  try {
    await render(<SettingsScreen />);

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
