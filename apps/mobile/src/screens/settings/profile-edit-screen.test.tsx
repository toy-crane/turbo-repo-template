import { beforeEach, expect, jest, test } from "@jest/globals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
} from "expo-image-picker";
import type { PropsWithChildren, ReactNode } from "react";
import { ActionSheetIOS, Alert, Pressable } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { USERNAME_CHECK_DELAY_MS } from "@/features/auth/state/use-username-step";
import {
  createFakeSession,
  createProfileRow,
  type FakeSupabase,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ProfileEditScreen, useProfileEditFlow } from "./profile-edit-screen";

jest.mock("@/features/auth/state/auth-session", () => ({
  useAuthSession: jest.fn(),
}));

jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("@/shared/test/fake-supabase") as typeof import("@/shared/test/fake-supabase")
    ).getFakeSupabase().client,
}));

jest.mock("expo-image-picker", () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

/**
 * Stand-ins for the native form.
 *
 * `useNativeState` is the one worth explaining: the real text field holds its
 * own text natively and reports changes back, so the stand-in keeps the text in
 * React state and exposes the same `{ value }` object. That way a write from the
 * screen — a suggestion being chosen, a capital being corrected — shows up here
 * exactly as it would on a device.
 */
jest.mock("@expo/ui", () => {
  const React = require("react") as typeof import("react");
  const {
    Pressable: NativePressable,
    Text: NativeText,
    TextInput: NativeTextInput,
    View,
  } = require("react-native") as typeof import("react-native");
  const Container = ({
    children,
    testID,
  }: PropsWithChildren<{ testID?: string }>) =>
    React.createElement(View, { testID }, children);
  const FieldGroup = Object.assign(Container, {
    Section: Container,
    SectionFooter: Container,
    SectionHeader: Container,
  });

  return {
    BottomSheet: ({
      children,
      isPresented,
    }: PropsWithChildren<{ isPresented: boolean }>) =>
      isPresented ? React.createElement(View, null, children) : null,
    Button: ({
      children,
      onPress,
      testID,
    }: PropsWithChildren<{ onPress?: () => void; testID?: string }>) =>
      React.createElement(
        NativePressable,
        { accessibilityRole: "button", onPress, testID },
        React.createElement(NativeText, null, children as ReactNode)
      ),
    Column: Container,
    FieldGroup,
    Host: Container,
    ListItem: ({
      children,
      onPress,
      testID,
    }: PropsWithChildren<{ onPress?: () => void; testID?: string }>) =>
      React.createElement(
        NativePressable,
        { accessibilityRole: "button", onPress, testID },
        children
      ),
    RNHostView: Container,
    Row: Container,
    Spacer: Container,
    Text: ({ children, testID }: PropsWithChildren<{ testID?: string }>) =>
      React.createElement(NativeText, { testID }, children),
    TextInput: ({
      editable,
      onChangeText,
      readOnly,
      testID,
      value,
    }: {
      editable?: boolean;
      onChangeText?: (text: string) => void;
      readOnly?: boolean;
      testID?: string;
      value?: { value: string };
    }) =>
      React.createElement(NativeTextInput, {
        editable: editable !== false && readOnly !== true,
        onChangeText,
        testID,
        value: value ? value.value : "",
      }),
    useNativeState: (initial: string) => {
      const [value, setValue] = React.useState(initial);

      return React.useMemo(
        () => ({
          get value() {
            return value;
          },
          set value(next: string) {
            setValue(next);
          },
        }),
        [value]
      );
    },
  };
});

const mockUseAuthSession = jest.mocked(useAuthSession);
const mockPicker = {
  launchCamera: jest.mocked(launchCameraAsync),
  launchLibrary: jest.mocked(launchImageLibraryAsync),
  requestCamera: jest.mocked(requestCameraPermissionsAsync),
};

/** Where a picture must land: the owner's own folder in the bucket. */
const OWN_FOLDER = /^user-1\//;

const SAVED = {
  display_name: "김민서",
  username: "minseokim",
};

/** A photo the picker would hand back: one pixel, already base64. */
const PICKED_PHOTO = {
  assets: [
    {
      base64: "/9j/4AAQ",
      mimeType: "image/jpeg",
      uri: "file:///tmp/photo.jpg",
    },
  ],
  canceled: false,
} as never;

/**
 * The screen plus the one control the route owns.
 *
 * 저장 lives in the native toolbar, which a component test cannot press, so the
 * harness offers the same seam on the same terms — the route's `canSave` and the
 * route's handler. Anything that would disable the toolbar button disables this.
 */
function ProfileEditHarness({ onSaved }: { onSaved?: () => void }) {
  const flow = useProfileEditFlow(
    onSaved ??
      (() => {
        // Most tests do not care that the screen would close.
      })
  );

  if (!flow.edit.isReady) {
    return null;
  }

  return (
    <>
      <ProfileEditScreen flow={flow} />
      <Pressable
        accessibilityLabel="저장"
        accessibilityRole="button"
        disabled={!flow.edit.canSave}
        onPress={flow.save}
        testID="save-button"
      />
    </>
  );
}

async function renderEditor({
  onSaved,
  queryClient = new QueryClient(),
}: {
  onSaved?: () => void;
  queryClient?: QueryClient;
} = {}) {
  const view = await renderWithHeroUI(
    <QueryClientProvider client={queryClient}>
      <ProfileEditHarness onSaved={onSaved} />
    </QueryClientProvider>
  );

  // The screen waits for the saved profile before it draws anything, because
  // the native fields take their starting text once.
  await screen.findByTestId("profile-nickname");

  return view;
}

/** Types an id and lets the debounce run, which is what triggers the check. */
async function typeUsername(value: string) {
  await act(() => {
    fireEvent.changeText(screen.getByTestId("profile-username"), value);
  });

  await act(async () => {
    jest.advanceTimersByTime(USERNAME_CHECK_DELAY_MS);
    await Promise.resolve();
  });
}

/**
 * The iOS action sheet is the operating system's, so the test stands in for the
 * OS: it records what was offered and answers with the entry that was pressed.
 */
let photoMenu: jest.SpiedFunction<
  typeof ActionSheetIOS.showActionSheetWithOptions
>;

beforeEach(() => {
  jest.clearAllMocks();
  photoMenu = jest
    .spyOn(ActionSheetIOS, "showActionSheetWithOptions")
    .mockImplementation(() => {
      // The test decides what was pressed, through choosePhotoSource.
    });
  resetFakeSupabase({
    profile: createProfileRow(SAVED),
    session: createFakeSession(),
  });
  mockUseAuthSession.mockReturnValue({
    session: createFakeSession(),
    status: "signedIn",
  });
});

test("저장한 값을 입력란에 그대로 채운다", async () => {
  await renderEditor();

  expect(screen.getByTestId("profile-nickname").props.value).toBe("김민서");
  expect(screen.getByTestId("profile-username").props.value).toBe("minseokim");
});

test("기본 상태에서는 아이디 규칙만 설명하고 검증 문구는 두지 않는다", async () => {
  await renderEditor();

  expect(screen.getByTestId("profile-username-policy")).toHaveTextContent(
    "아이디는 30일에 한 번 바꿀 수 있어요. 이전 아이디는 30일 동안 다른 사람이 사용할 수 없어요."
  );
  expect(screen.queryByTestId("profile-username-message")).toBeNull();
  expect(screen.queryByTestId("profile-nickname-message")).toBeNull();
});

test("변경 제한 중에는 아이디만 잠그고 다시 바꿀 날짜를 보여 준다", async () => {
  const unlockAt = new Date(2026, 8, 11, 9, 0);

  resetFakeSupabase({
    profile: createProfileRow({
      ...SAVED,
      username_locked_until: unlockAt.toISOString(),
    }),
    session: createFakeSession(),
  });

  await renderEditor();

  expect(screen.getByTestId("profile-username").props.editable).toBe(false);
  // The nickname is untouched by the id's lock: someone who renamed last week
  // still has to be able to fix their name.
  expect(screen.getByTestId("profile-nickname").props.editable).not.toBe(false);
  expect(screen.getByTestId("profile-username-policy")).toHaveTextContent(
    "2026년 9월 11일부터 아이디를 다시 바꿀 수 있어요."
  );
});

test("이미 사용 중인 아이디에는 대안을 제안한다", async () => {
  jest.useFakeTimers();

  try {
    resetFakeSupabase({
      profile: createProfileRow(SAVED),
      session: createFakeSession(),
      takenUsernames: ["takenone"],
    });

    await renderEditor();
    await typeUsername("takenone");

    await waitFor(() => {
      expect(screen.getByTestId("profile-username-message")).toHaveTextContent(
        "이미 사용 중인 아이디예요."
      );
    });

    const suggestions = await screen.findAllByTestId(
      "profile-username-suggestion"
    );

    expect(suggestions).toHaveLength(3);
  } finally {
    jest.useRealTimers();
  }
});

test("사진이 없으면 삭제 항목을 사진 메뉴에 두지 않는다", async () => {
  await renderEditor();

  await userEvent.setup().press(screen.getByTestId("profile-edit-photo"));

  const [options] = photoMenu.mock.calls[0];

  expect(options.options).toEqual([
    "사진 찍기",
    "사진 보관함에서 선택",
    "취소",
  ]);
});

test("사진을 고르면 저장할 때 자기 폴더에 올리고 프로필이 그 파일을 가리킨다", async () => {
  const fake = resetFakeSupabase({
    profile: createProfileRow(SAVED),
    session: createFakeSession(),
  });

  mockPicker.launchLibrary.mockResolvedValue(PICKED_PHOTO);

  await renderEditor();

  const user = userEvent.setup();

  await user.press(screen.getByTestId("profile-edit-photo"));
  await choosePhotoSource(1);
  await saveProfile(fake);

  await waitFor(() => {
    expect(fake.storedObjects()[0]?.path).toMatch(OWN_FOLDER);
  });

  const saved = fake.storedProfile();

  expect(saved.avatar_path).toMatch(OWN_FOLDER);
  // Chosen by the person, so a provider must not fill the picture back in on the
  // next sign-in.
  expect(fake.updates.at(-1)?.values.avatar_chosen_by_user).toBe(true);
});

test("사진이 있으면 삭제 항목을 마지막에 두고, 지우면 사진 열을 비운다", async () => {
  const fake = resetFakeSupabase({
    profile: createProfileRow({ ...SAVED, avatar_path: "user-1/old.jpg" }),
    session: createFakeSession(),
  });

  await renderEditor();

  const user = userEvent.setup();

  await user.press(screen.getByTestId("profile-edit-photo"));

  const [options] = photoMenu.mock.calls[0];

  expect(options.options).toEqual([
    "사진 찍기",
    "사진 보관함에서 선택",
    "현재 사진 삭제",
    "취소",
  ]);
  // Deleting is the one entry that removes something, so it is the one iOS draws
  // in red.
  expect(options.destructiveButtonIndex).toBe(2);

  await choosePhotoSource(2);
  await saveProfile(fake);

  const saved = fake.updates.at(-1)?.values;

  expect(saved?.avatar_path).toBeNull();
  // The provider's picture goes with it, and the flag is what stops the next
  // sign-in from putting that picture back.
  expect(saved?.avatar_url).toBeNull();
  expect(saved?.avatar_chosen_by_user).toBe(true);
});

test("아이디가 그대로면 확인 없이 저장한다", async () => {
  const fake = resetFakeSupabase({
    profile: createProfileRow(SAVED),
    session: createFakeSession(),
  });
  const alert = jest.spyOn(Alert, "alert");

  await renderEditor();

  await act(() => {
    fireEvent.changeText(screen.getByTestId("profile-nickname"), "김민서2");
  });

  await saveProfile(fake);

  expect(alert).not.toHaveBeenCalled();
  expect(fake.storedProfile().display_name).toBe("김민서2");
});

test("바꾼 것이 없으면 저장할 수 없다", async () => {
  await renderEditor();

  expect(screen.getByTestId("save-button").props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: true })
  );
});

test("아이디를 바꾸면 확인을 거치고, 취소하면 입력한 값을 유지한다", async () => {
  jest.useFakeTimers();

  try {
    const fake = resetFakeSupabase({
      profile: createProfileRow(SAVED),
      session: createFakeSession(),
    });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {
      // The test answers the dialog through the buttons it was given.
    });

    await renderEditor();
    await typeUsername("minseokim2");

    // 저장 stays disabled until the id has been confirmed free, so pressing it
    // before then would test nothing.
    await waitFor(() => {
      expect(
        screen.getByTestId("save-button").props.accessibilityState
      ).toEqual(expect.objectContaining({ disabled: false }));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("save-button"));
      await Promise.resolve();
    });

    const [title, body, buttons] = alert.mock.calls[0];

    expect(title).toBe("아이디를 변경할까요?");
    // The previous-id protection is in the footer the person just read. Saying it
    // again here would bury the one fact this dialog exists for.
    expect(body).toBe("변경 후 30일 동안 다시 바꿀 수 없어요.");
    expect(buttons?.map((button) => button.text)).toEqual(["취소", "변경"]);
    // 변경 replaces a value rather than removing one, so it is not destructive.
    expect(buttons?.[1]?.style).toBeUndefined();

    // Cancelling closes the dialog and nothing else. Nothing was written, and the
    // draft is still there to save — 저장 would be disabled if it had been
    // discarded, because there would be no change left to make.
    expect(fake.updates).toHaveLength(0);
    expect(screen.getByTestId("save-button").props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false })
    );

    await act(async () => {
      buttons?.[1]?.onPress?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(fake.storedProfile().username).toBe("minseokim2");
    });
  } finally {
    jest.useRealTimers();
  }
});

test("저장에 실패해도 입력한 값을 남기고 다시 저장할 수 있다", async () => {
  const fake = resetFakeSupabase({
    profile: createProfileRow(SAVED),
    session: createFakeSession(),
  });

  fake.failNextSave(new Error("Network request failed"));

  await renderEditor();

  await act(() => {
    fireEvent.changeText(screen.getByTestId("profile-nickname"), "고친 이름");
  });

  await act(async () => {
    fireEvent.press(screen.getByTestId("save-button"));
    await Promise.resolve();
  });

  expect(await screen.findByTestId("profile-save-failure")).toHaveTextContent(
    "프로필을 저장하지 못했어요. 입력한 내용은 그대로 두었어요. 다시 저장해 주세요."
  );

  // The second press is the whole point of keeping the draft.
  await saveProfile(fake);

  await waitFor(() => {
    expect(fake.storedProfile().display_name).toBe("고친 이름");
  });
});

test("카메라를 거부하면 안내하고, 보관함을 고르면 안내를 지운다", async () => {
  mockPicker.requestCamera.mockResolvedValue({
    granted: false,
  } as never);
  mockPicker.launchLibrary.mockResolvedValue(PICKED_PHOTO);

  await renderEditor();

  const user = userEvent.setup();

  await user.press(screen.getByTestId("profile-edit-photo"));
  await choosePhotoSource(0);

  expect(await screen.findByTestId("profile-camera-denied")).toHaveTextContent(
    "카메라 접근을 허용하면 바로 프로필 사진을 찍을 수 있어요. 설정에서 권한을 바꿀 수 있어요."
  );
  expect(mockPicker.launchCamera).not.toHaveBeenCalled();

  await user.press(screen.getByTestId("profile-edit-photo"));
  await choosePhotoSource(1);

  // The notice stops being useful the moment they have a photo another way.
  await waitFor(() => {
    expect(screen.queryByTestId("profile-camera-denied")).toBeNull();
  });
});

/**
 * Picks an entry from the iOS action sheet the screen just opened.
 *
 * The sheet is the operating system's, so the test answers it the way the OS
 * would: by calling back with the index that was pressed.
 */
async function choosePhotoSource(index: number) {
  const [, respond] = photoMenu.mock.calls[0];

  await act(async () => {
    respond(index);
    await Promise.resolve();
  });
}

/** Presses 저장 and waits for the write it starts. */
async function saveProfile(fake: FakeSupabase) {
  const before = fake.updates.length;

  await act(async () => {
    fireEvent.press(screen.getByTestId("save-button"));
    await Promise.resolve();
  });

  await waitFor(() => {
    expect(fake.updates.length).toBeGreaterThan(before);
  });
}
