import { beforeEach, expect, jest, test } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { Alert } from "react-native";

import {
  createFakeSession,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { AccountDeletionScreen } from "./account-deletion-screen";

const DANGER = "#dc2626";
const FOREGROUND = "#111114";
const IRREVERSIBLE_COPY = /복구할 수 없습니다/;

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
    SectionFooter: Container,
  });

  return {
    Button: ({
      disabled,
      label,
      onPress,
      testID,
    }: {
      disabled?: boolean;
      label?: string;
      onPress?: () => void;
      testID?: string;
    }) =>
      React.createElement(
        Pressable,
        {
          accessibilityRole: "button",
          accessibilityState: { disabled: Boolean(disabled) },
          disabled,
          onPress,
          testID,
        },
        React.createElement(NativeText, null, label)
      ),
    FieldGroup,
    Host: Container,
    Row: Container,
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

let alertButtons: import("react-native").AlertButton[] = [];

beforeEach(() => {
  resetFakeSupabase({ session: createFakeSession() });
  alertButtons = [];
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    alertButtons = buttons ?? [];
  });
});

function renderAccountDeletion(queryClient = new QueryClient()) {
  return renderWithHeroUI(
    <QueryClientProvider client={queryClient}>
      <AccountDeletionScreen danger={DANGER} foreground={FOREGROUND} />
    </QueryClientProvider>
  );
}

async function openFinalConfirmation() {
  await fireEvent.press(screen.getByRole("button", { name: "계정 탈퇴" }));
}

function pressAlertButton(text: string) {
  const button = alertButtons.find((candidate) => candidate.text === text);

  if (!button) {
    throw new Error(`${text} 확인창 버튼이 없습니다.`);
  }

  return button.onPress?.();
}

test("삭제 대상과 복구할 수 없다는 점을 알린 뒤 마지막 확인을 받는다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });

  await renderAccountDeletion();

  expect(screen.getByText("로그인 계정")).toBeOnTheScreen();
  expect(screen.getByText("프로필, 닉네임과 아이디")).toBeOnTheScreen();
  expect(screen.getByText("올린 프로필 사진")).toBeOnTheScreen();
  expect(screen.getByText(IRREVERSIBLE_COPY)).toBeOnTheScreen();

  await openFinalConfirmation();

  expect(Alert.alert).toHaveBeenCalledWith(
    "계정을 탈퇴할까요?",
    "계정과 연결된 정보가 바로 삭제되며 복구할 수 없습니다.",
    expect.arrayContaining([
      expect.objectContaining({ style: "cancel", text: "취소" }),
      expect.objectContaining({ style: "destructive", text: "계정 탈퇴" }),
    ])
  );
  expect(fake.functions.invoke).not.toHaveBeenCalled();

  pressAlertButton("취소");

  expect(fake.functions.invoke).not.toHaveBeenCalled();
});

test("최종 확인 뒤 한 번만 삭제하고 기기 로그인과 사용자 캐시를 지운다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });
  const queryClient = new QueryClient();
  let finishDeletion = () => {
    // Replaced by the pending function call below.
  };

  fake.functions.invoke.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishDeletion = () => {
          resolve({ data: { deleted: true }, error: null });
        };
      })
  );
  queryClient.setQueryData(["notes"], ["현재 사용자의 데이터"]);

  await renderAccountDeletion(queryClient);
  await openFinalConfirmation();

  await act(() => {
    pressAlertButton("계정 탈퇴");
    pressAlertButton("계정 탈퇴");
  });

  expect(
    await screen.findByRole("button", { name: "계정 탈퇴 중" })
  ).toBeDisabled();
  expect(fake.functions.invoke).toHaveBeenCalledTimes(1);

  await act(() => {
    finishDeletion();
  });

  await waitFor(() => {
    expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  expect(queryClient.getQueryData(["notes"])).toBeUndefined();
});

test("삭제가 실패하면 로그인과 캐시를 유지하고 다시 시도할 수 있다", async () => {
  const fake = resetFakeSupabase({ session: createFakeSession() });
  const queryClient = new QueryClient();

  fake.functions.invoke.mockResolvedValueOnce({
    data: null,
    error: new Error("Network request failed"),
  } as never);
  queryClient.setQueryData(["notes"], ["현재 사용자의 데이터"]);

  await renderAccountDeletion(queryClient);
  await openFinalConfirmation();

  await act(async () => {
    await pressAlertButton("계정 탈퇴");
  });

  expect(await screen.findByTestId("account-deletion-error")).toHaveTextContent(
    "계정 탈퇴를 끝내지 못했습니다. 다시 시도해 주세요."
  );
  expect(fake.auth.signOut).not.toHaveBeenCalled();
  expect(queryClient.getQueryData(["notes"])).toEqual(["현재 사용자의 데이터"]);

  await openFinalConfirmation();
  await act(async () => {
    await pressAlertButton("계정 탈퇴");
  });

  expect(fake.functions.invoke).toHaveBeenCalledTimes(2);
  expect(fake.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(queryClient.getQueryData(["notes"])).toBeUndefined();
});
