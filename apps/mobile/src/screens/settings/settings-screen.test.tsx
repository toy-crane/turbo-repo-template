import { beforeEach, expect, jest, test } from "@jest/globals";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { AccessibilityInfo, Platform } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import {
  createFakeSession,
  createProfileRow,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";
import {
  createTestQueryClient,
  renderWithHeroUI,
} from "@/shared/test/render-with-heroui";
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

jest.mock("@/shared/ui/action-progress", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  // The platform indicator itself is native. What a test can check is that it
  // appeared, so the stand-in is a node carrying the same testID.
  return {
    ActionProgress: ({ testID }: { testID?: string }) =>
      React.createElement(View, { testID }),
  };
});

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
    SectionFooter: Container,
    SectionHeader: Container,
  });

  return {
    // A native button takes a press anywhere across it and reads its own
    // children as its accessible name, so the stand-in does the same.
    Button: ({
      children,
      onPress,
      testID,
    }: PropsWithChildren<{
      onPress?: () => void;
      testID?: string;
    }>) =>
      React.createElement(
        Pressable,
        { accessibilityRole: "button", onPress, testID },
        children
      ),
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
      testID,
      textStyle,
    }: PropsWithChildren<{
      testID?: string;
      textStyle?: import("react-native").TextStyle;
    }>) =>
      React.createElement(NativeText, { style: textStyle, testID }, children),
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
  onOpenProfile = () => {
    // Most tests are about something else on this screen.
  },
  queryClient = createTestQueryClient(),
}: {
  onOpenProfile?: () => void;
  queryClient?: QueryClient;
} = {}) {
  return renderWithHeroUI(
    <QueryClientProvider client={queryClient}>
      <SettingsScreen
        danger={DANGER}
        muted={MUTED}
        onOpenProfile={onOpenProfile}
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

  // The button keeps its name for the whole action; only the indicator appears.
  expect(await screen.findByTestId("sign-out-progress")).toBeOnTheScreen();
  expect(screen.queryByText("로그아웃 중")).toBeNull();

  const pending = screen.getByRole("button", { name: "로그아웃" });

  await act(() => {
    fireEvent.press(pending);
    fireEvent.press(pending);
  });

  await act(() => {
    release();
  });

  expect(fake.auth.signOut).toHaveBeenCalledTimes(1);
});

test("Android는 로그아웃이 시작되면 진행 중임을 화면 읽기에 알린다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  const platform = jest.replaceProperty(Platform, "OS", "android");
  let release = () => {
    // Replaced by the pending implementation below.
  };

  fake.auth.signOut.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => resolve({ error: null });
      })
  );

  try {
    await renderSettings();

    expect(announce).not.toHaveBeenCalled();

    await act(() => {
      fireEvent.press(screen.getByRole("button", { name: "로그아웃" }));
    });

    expect(announce).toHaveBeenCalledWith("로그아웃 진행 중");

    await act(() => {
      release();
    });
  } finally {
    platform.restore();
  }
});

test("로그아웃이 실패해도 이전 사용자의 캐시는 남기지 않는다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });
  const queryClient = createTestQueryClient();

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

test("프로필 사진과 프로필 행이 같은 화면을 연다", async () => {
  const onOpenProfile = jest.fn();
  const user = userEvent.setup();

  await renderSettings({ onOpenProfile });

  await user.press(await screen.findByTestId("settings-profile-photo"));
  await user.press(screen.getByTestId("profile-row"));

  // Both entry points, one destination: a photo menu opening straight from
  // Settings would split saving the picture from saving the rest of the profile.
  expect(onOpenProfile).toHaveBeenCalledTimes(2);
});

test("계정 삭제는 설정 목록에 없다", async () => {
  await renderSettings();

  // It lives in 프로필 instead. Two rows that end something, on one screen, take
  // weight from each other; the one that cannot be undone keeps its own screen.
  expect(screen.queryByText("계정 삭제")).toBeNull();
  expect(screen.queryByTestId("delete-account-row")).toBeNull();
});

test("로그아웃은 목록 마지막에 이름 없는 그룹으로 혼자 선다", async () => {
  await renderSettings();

  const sections = screen.getByTestId("settings-field-group").props.children;

  // Nothing follows it, and nothing shares the group. That placement is what
  // says this row ends the screen rather than belonging to the settings above.
  expect(sections.at(-1).props.testID).toBe("sign-out-section");
  expect(sections.at(-1).props.title).toBeUndefined();
  expect(screen.getByRole("button", { name: "로그아웃" })).toBeOnTheScreen();
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
