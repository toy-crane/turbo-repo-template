import { expect, jest, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

/*
  Compose stands in for itself here. Jest resolves this project as iOS, where
  the real `Host` asks a native module for the Material palette before it
  renders anything, so the Android control could not mount at all. What the
  stand-ins keep is the seam this component owns: which props reach the Host and
  which reach the button. The filled circle, its grey counterpart and the press
  are Material's, and they are checked on a device with `agent-device`.
*/
jest.mock("@expo/ui/jetpack-compose", () => {
  const react = require("react");
  const { View } = require("react-native");

  return {
    FilledIconButton: ({
      children,
      enabled,
    }: {
      children?: unknown;
      enabled?: boolean;
    }) =>
      react.createElement(
        View,
        { enabled, testID: "save-filled-button" },
        children
      ),
    Host: ({ children }: { children?: unknown }) =>
      react.createElement(View, null, children),
    Icon: ({ source }: { source?: unknown }) =>
      react.createElement(View, { source, testID: "save-icon" }),
  };
});

// Imported by its platform path on purpose: on iOS the same control comes from
// `Stack.Toolbar.Button`, so this file is the only place the Android one exists.
import { ProfileSaveHeaderAction } from "./profile-save-header-action.android";

test("저장할 수 있을 때 이름이 저장인 버튼을 내놓는다", async () => {
  await render(
    <ProfileSaveHeaderAction
      isDisabled={false}
      isPending={false}
      onPress={jest.fn()}
      tintColor="#111114"
    />
  );

  expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();
  expect(screen.getByTestId("save-filled-button")).toHaveProp("enabled", true);
  expect(screen.getByTestId("save-icon")).toBeOnTheScreen();
});

// The name is what a screen reader has; the shape tells it nothing. Losing the
// name to Compose is the failure this test exists for.
test("저장할 수 없을 때도 이름은 그대로이고 비활성으로 알린다", async () => {
  await render(
    <ProfileSaveHeaderAction
      isDisabled
      isPending={false}
      onPress={jest.fn()}
      tintColor="#111114"
    />
  );

  expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  expect(screen.getByTestId("save-filled-button")).toHaveProp("enabled", false);
});

test("저장 중에는 같은 헤더 자리를 진행 표시가 차지한다", async () => {
  await render(
    <ProfileSaveHeaderAction
      isDisabled
      isPending
      onPress={jest.fn()}
      tintColor="#111114"
    />
  );

  expect(screen.queryByRole("button", { name: "저장" })).not.toBeOnTheScreen();
  expect(
    screen.getByRole("progressbar", { name: "저장 중" })
  ).toBeOnTheScreen();
});
