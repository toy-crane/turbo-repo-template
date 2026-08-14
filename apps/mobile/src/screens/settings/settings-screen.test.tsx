import { beforeEach, expect, jest, test } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import Constants from "expo-constants";
import { useHeaderHeight } from "expo-router/react-navigation";
import type { PropsWithChildren } from "react";
import { Platform } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import {
  createFakeSession,
  createProfileRow,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { SettingsScreen } from "./settings-screen";

/** The colours the root layout would hand this screen. */
const DANGER = "#dc2626";
const MUTED = "#6b7280";
const APP_VERSION = Constants.expoConfig?.version ?? "Unknown";
const HEADER_HEIGHT = 108;

jest.mock("@/features/auth/state/auth-session", () => ({
  useAuthSession: jest.fn(),
}));

jest.mock("expo-router/react-navigation", () => ({
  useHeaderHeight: jest.fn(),
}));

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
  const FieldGroup = Object.assign(Container, {
    Section: Container,
    SectionHeader: Container,
  });

  return {
    FieldGroup,
    Host: Container,
    // Renders as its own node so a test can assert the row shows a chevron.
    Icon: ({ name }: { name: string }) =>
      React.createElement(NativeText, null, name),
    // A native list row takes a press anywhere across it and reads its own text
    // as its accessible name, so the stand-in does the same.
    ListItem: ({
      children,
      onPress,
      testID,
      trailing,
    }: PropsWithChildren<{
      onPress?: () => void;
      testID?: string;
      trailing?: React.ReactNode;
    }>) =>
      React.createElement(
        Pressable,
        { accessibilityRole: "button", onPress, testID },
        children,
        trailing
      ),
    // Hosts plain React Native children inside the native tree, which is exactly
    // what a View does here.
    RNHostView: Container,
    Row: ({
      children,
      onPress,
      testID,
    }: PropsWithChildren<{ onPress?: () => void; testID?: string }>) =>
      onPress
        ? React.createElement(
            Pressable,
            { accessibilityRole: "button", onPress, testID },
            children
          )
        : React.createElement(View, { testID }, children),
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

const mockUseAuthSession = jest.mocked(useAuthSession);
const mockUseHeaderHeight = jest.mocked(useHeaderHeight);

beforeEach(() => {
  resetFakeSupabase({ session: createFakeSession() });
  mockUseAuthSession.mockReturnValue({
    session: createFakeSession(),
    status: "signedIn",
  });
  mockUseHeaderHeight.mockReturnValue(HEADER_HEIGHT);
});

function renderSettings({
  onDeleteAccount = () => {
    // Most tests are about something else on this screen.
  },
  onEditProfile = () => {
    // Most tests are about something else on this screen.
  },
  queryClient = new QueryClient(),
}: {
  onDeleteAccount?: () => void;
  onEditProfile?: () => void;
  queryClient?: QueryClient;
} = {}) {
  return renderWithHeroUI(
    <QueryClientProvider client={queryClient}>
      <SettingsScreen
        danger={DANGER}
        muted={MUTED}
        onDeleteAccount={onDeleteAccount}
        onEditProfile={onEditProfile}
      />
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

  await renderSettings({ queryClient });

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

test("현재 공개 프로필을 화면 위에 보여 준다", async () => {
  resetFakeSupabase({
    profile: createProfileRow({
      display_name: "김민서",
      username: "minseokim",
    }),
    session: createFakeSession(),
  });

  await renderSettings();

  // The header is on screen before the profile read answers, so waiting for the
  // element is not the same as waiting for the values in it.
  await waitFor(() => {
    expect(screen.getByTestId("settings-profile-name")).toHaveTextContent(
      "김민서"
    );
  });
  // No `@` in front: the app has no mentions and no profile addresses, so the id
  // is shown exactly as it is stored and typed.
  expect(screen.getByTestId("settings-profile-username")).toHaveTextContent(
    "minseokim"
  );
  expect(screen.queryByText("@minseokim")).toBeNull();
});

test("프로필 사진과 프로필 수정 행이 같은 화면을 연다", async () => {
  const onEditProfile = jest.fn();
  const user = userEvent.setup();

  await renderSettings({ onEditProfile });

  await user.press(await screen.findByTestId("settings-profile-photo"));
  await user.press(screen.getByTestId("edit-profile-row"));

  // Both entry points, one destination: a photo menu opening straight from
  // Settings would split saving the picture from saving the rest of the profile.
  expect(onEditProfile).toHaveBeenCalledTimes(2);
});

test("계정 탈퇴 행은 별도 안내 화면을 연다", async () => {
  const onDeleteAccount = jest.fn();

  await renderSettings({ onDeleteAccount });

  await fireEvent.press(screen.getByTestId("delete-account-row"));

  expect(onDeleteAccount).toHaveBeenCalledTimes(1);
});

test("iOS 설정 텍스트는 네이티브 기본 색상을 그대로 쓴다", async () => {
  const view = await renderSettings();

  expect(view.getByText("버전").props.style).toBeUndefined();
});

test("Android 설정 스위치가 기본 label 행으로 각 항목을 한 번 표시한다", async () => {
  const platform = jest.replaceProperty(Platform, "OS", "android");

  try {
    const view = await renderSettings();

    expect(view.getAllByText("알림")).toHaveLength(1);
    expect(view.getAllByText("햅틱 반응")).toHaveLength(1);
    expect(view.getByTestId("settings-field-group")).toHaveStyle({
      paddingTop: HEADER_HEIGHT,
    });
    // Text inside a Material row inherits its native content colour. Only the
    // value is quieter because it is supporting information.
    expect(view.getByText("버전").props.style).toBeUndefined();
    expect(view.getByText(APP_VERSION)).toHaveStyle({ color: MUTED });
    expect(
      view.getByTestId("notifications-switch").props.accessibilityState
    ).toEqual({ checked: false });
    expect(view.getByTestId("haptics-switch").props.accessibilityState).toEqual(
      {
        checked: true,
      }
    );
  } finally {
    platform.restore();
  }
});
