import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent } from "@testing-library/react-native";
import { router as expoRouter } from "expo-router";
import {
  act,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import { queryClient } from "@/core/providers/query-provider";
import {
  createEmptyProfile,
  createFakeSession,
  createProfileRow,
  type FakeSupabaseOptions,
  resetFakeSupabase,
} from "@/shared/test/fake-supabase";

/**
 * Profile onboarding, driven through the router the way a person meets it.
 *
 * The screens are not rendered on their own here: which one exists at all is
 * the behaviour under test, and that is decided by the session and the profile
 * together rather than by either screen.
 */

jest.mock("@/shared/supabase/client", () => ({
  getSupabaseClient: () =>
    (
      require("@/shared/test/fake-supabase") as typeof import("@/shared/test/fake-supabase")
    ).getFakeSupabase().client,
}));

jest.mock("@/screens/home/home-screen", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    HomeScreen: () =>
      React.createElement(View, { accessibilityLabel: "Home placeholder" }),
  };
});

/** Longer than the availability debounce, so a settled value gets its answer. */
const SETTLE_TIMEOUT = 2000;
/** Long enough for the profile read to retry once and then give up. */
const PROFILE_FAILURE_TIMEOUT = 5000;

function startOnboarding(options: FakeSupabaseOptions = {}) {
  return resetFakeSupabase({
    profile: createEmptyProfile(),
    session: createFakeSession(),
    ...options,
  });
}

async function openApp() {
  const router = renderRouter("./app", { initialUrl: "/" });

  await router;

  return router;
}

/**
 * React flushes a state update after the event returns, so a line that reads
 * what the previous line typed has to wait for that flush. It is also what
 * keeps an update that settles on its own from landing between two act scopes.
 */
async function type(testID: string, text: string) {
  await act(() => {
    fireEvent.changeText(screen.getByTestId(testID), text);
  });
}

async function press(label: string) {
  await act(() => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

/** Types an id and waits for the automatic check to answer. */
async function typeUsername(value: string) {
  await type("onboarding-username", value);

  await waitFor(
    () => {
      expect(screen.queryByTestId("onboarding-username-checking")).toBeNull();
    },
    { timeout: SETTLE_TIMEOUT }
  );
}

async function goToUsernameScreen(nickname = "김민서") {
  await type("onboarding-nickname", nickname);
  await press("다음");

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-username")).toBeOnTheScreen();
  });
}

beforeEach(() => {
  // The cache outlives a render on purpose, so without this one test's profile
  // decides the next one's starting screen.
  queryClient.clear();
  resetFakeSupabase();
});

afterEach(async () => {
  // A read that failed leaves a retry waiting. Left alone it wakes up during
  // the next test, against a tree that has already been torn down.
  await queryClient.cancelQueries();
  queryClient.clear();
});

test("두 값이 모두 있는 세션을 복원하면 온보딩 없이 홈을 연다", async () => {
  resetFakeSupabase({ session: createFakeSession() });
  await openApp();

  await waitFor(() => {
    expect(screen.getByLabelText("Home placeholder")).toBeOnTheScreen();
  });

  expect(screen.queryByTestId("onboarding-nickname")).toBeNull();
});

test("프로필이 비어 있으면 앱 화면 대신 닉네임 화면을 연다", async () => {
  startOnboarding();
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });

  expect(screen.queryByLabelText("Home placeholder")).toBeNull();
});

test("온보딩 두 화면의 제목을 같은 문장 형식으로 보여 준다", async () => {
  startOnboarding();
  await openApp();

  await waitFor(() => {
    expect(screen.getByText("닉네임을 정해 주세요")).toBeOnTheScreen();
  });

  await goToUsernameScreen();

  expect(screen.getByText("아이디를 정해 주세요")).toBeOnTheScreen();
});

test("아이디만 없어도 온보딩을 연다", async () => {
  startOnboarding({
    profile: createProfileRow({ display_name: "김민서" }),
  });
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
});

test("프로필을 확인하는 동안에는 온보딩도 홈도 잠깐 나타나지 않는다", async () => {
  const fake = startOnboarding({ holdProfile: true });

  await openApp();

  expect(screen.getByLabelText("로그인 상태 확인 중")).toBeOnTheScreen();
  expect(screen.queryByTestId("onboarding-nickname")).toBeNull();
  expect(screen.queryByLabelText("Home placeholder")).toBeNull();

  await act(() => {
    fake.settleProfile();
  });

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
});

test("프로필을 읽지 못하면 로그아웃하지 않고 다시 시도하게 한다", async () => {
  const fake = startOnboarding({ profileError: new Error("Failed to fetch") });

  await openApp();

  await waitFor(
    () => {
      expect(screen.getByTestId("profile-unavailable")).toBeOnTheScreen();
    },
    { timeout: PROFILE_FAILURE_TIMEOUT }
  );

  // A failed read is not the end of a session. Signing the person out here
  // would cost them a working one over a dropped request.
  expect(fake.auth.signOut).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Google로 계속하기")).toBeNull();

  fake.recoverProfile();

  await press("프로필 다시 불러오기");

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
});

test("제공자가 준 이름은 고칠 수 있는 닉네임 초기값으로 나타난다", async () => {
  startOnboarding({
    profile: createProfileRow({ display_name: "김민서" }),
  });
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toHaveDisplayValue(
      "김민서"
    );
  });
});

test("닉네임이 비었거나 30자를 넘으면 다음으로 갈 수 없다", async () => {
  startOnboarding();
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });

  expect(screen.getByLabelText("다음")).toBeDisabled();
  expect(screen.queryByTestId("onboarding-error-nickname")).toBeNull();

  await type("onboarding-nickname", "가".repeat(31));

  expect(screen.getByLabelText("다음")).toBeDisabled();
  expect(screen.getByTestId("onboarding-error-nickname")).toHaveTextContent(
    "30자 이하로 입력해 주세요."
  );

  await type("onboarding-nickname", "김민서");

  expect(screen.getByLabelText("다음")).toBeEnabled();
});

test("이메일에서 만든 아이디 후보를 미리 채우고 자동으로 확인한다", async () => {
  startOnboarding();
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
  await goToUsernameScreen();

  // toy.crane@example.com 에서 만든 값이다.
  expect(screen.getByTestId("onboarding-username")).toHaveDisplayValue(
    "toycrane"
  );

  await waitFor(
    () => {
      expect(
        screen.getByTestId("onboarding-username-available")
      ).toBeOnTheScreen();
    },
    { timeout: SETTLE_TIMEOUT }
  );

  expect(screen.getByLabelText("사용할 수 있는 아이디")).toBeOnTheScreen();
  expect(screen.getByLabelText("시작하기")).toBeEnabled();
});

test("뒤로 갔다 돌아와도 두 입력값이 남아 있다", async () => {
  startOnboarding();
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
  await goToUsernameScreen("김민서");
  await typeUsername("minseokim");

  await act(() => {
    expoRouter.back();
  });

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toHaveDisplayValue(
      "김민서"
    );
  });

  await press("다음");

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-username")).toHaveDisplayValue(
      "minseokim"
    );
  });
});

test("대문자로 입력해도 소문자로 바꿔 보여준다", async () => {
  startOnboarding();
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
  await goToUsernameScreen();

  await type("onboarding-username", "MinSeo_KIM");

  expect(screen.getByTestId("onboarding-username")).toHaveDisplayValue(
    "minseo_kim"
  );
});

test("형식이 틀리면 오류를 보여주고 시작하기를 막는다", async () => {
  startOnboarding();
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
  await goToUsernameScreen();

  await type("onboarding-username", "민서");

  expect(screen.getByTestId("onboarding-error-username")).toHaveTextContent(
    "영문 소문자, 숫자, 밑줄(_)만 사용할 수 있어요."
  );
  expect(screen.getByLabelText("시작하기")).toBeDisabled();
});

test("이미 쓰는 아이디면 후보 세 개를 보여주고 고르면 다시 확인한다", async () => {
  startOnboarding({ takenUsernames: ["toycrane"] });
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
  await goToUsernameScreen();

  await waitFor(
    () => {
      expect(screen.getByTestId("onboarding-error-username")).toHaveTextContent(
        "이미 사용 중인 아이디예요."
      );
    },
    { timeout: SETTLE_TIMEOUT }
  );

  expect(screen.getByLabelText("시작하기")).toBeDisabled();

  const suggestions = await waitFor(
    () => {
      const found = screen.getAllByTestId("onboarding-username-suggestion");

      expect(found).toHaveLength(3);

      return found;
    },
    { timeout: SETTLE_TIMEOUT }
  );

  await act(() => {
    fireEvent.press(suggestions[0]);
  });

  await waitFor(
    () => {
      expect(
        screen.getByTestId("onboarding-username-available")
      ).toBeOnTheScreen();
    },
    { timeout: SETTLE_TIMEOUT }
  );

  expect(screen.getByLabelText("시작하기")).toBeEnabled();
});

test("예약한 아이디는 쓸 수 없다고 알린다", async () => {
  startOnboarding();
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
  await goToUsernameScreen();
  await typeUsername("admin");

  expect(screen.getByTestId("onboarding-error-username")).toHaveTextContent(
    "사용할 수 없는 아이디예요."
  );
  expect(screen.getByLabelText("시작하기")).toBeDisabled();
});

test("확인 요청이 실패하면 입력값을 지우지 않고 다시 확인하게 한다", async () => {
  startOnboarding({ usernameStatusError: new Error("Failed to fetch") });
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
  await goToUsernameScreen();

  await waitFor(
    () => {
      expect(screen.getByTestId("onboarding-error-username")).toHaveTextContent(
        "아이디를 확인하지 못했어요. 다시 시도해 주세요."
      );
    },
    { timeout: SETTLE_TIMEOUT }
  );

  expect(screen.getByTestId("onboarding-username")).toHaveDisplayValue(
    "toycrane"
  );
  expect(screen.getByLabelText("아이디 다시 확인하기")).toBeOnTheScreen();
  expect(screen.getByLabelText("시작하기")).toBeDisabled();
});

test("시작하기는 두 값을 함께 저장하고 홈을 연다", async () => {
  const fake = startOnboarding();
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
  await goToUsernameScreen("  김민서  ");
  await typeUsername("minseokim");

  await press("시작하기");

  await waitFor(() => {
    expect(screen.getByLabelText("Home placeholder")).toBeOnTheScreen();
  });

  const saved = fake.updates.at(-1);

  // One update carrying both values: the database is what decides the id is
  // still free, and it can only do that for the pair together.
  expect(saved?.values).toEqual({
    display_name: "김민서",
    username: "minseokim",
  });
  expect(screen.queryByTestId("onboarding-nickname")).toBeNull();
});

test("저장 직전에 아이디를 뺏기면 값을 잃지 않고 후보를 보여준다", async () => {
  const fake = startOnboarding();
  await openApp();

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-nickname")).toBeOnTheScreen();
  });
  await goToUsernameScreen("김민서");
  await typeUsername("minseokim");

  fake.failNextSave(
    Object.assign(new Error("duplicate key value"), { code: "23505" })
  );
  await press("시작하기");

  await waitFor(() => {
    expect(screen.getByTestId("onboarding-error-username")).toHaveTextContent(
      "이미 사용 중인 아이디예요."
    );
  });

  expect(screen.queryByLabelText("Home placeholder")).toBeNull();
  expect(screen.getByTestId("onboarding-username")).toHaveDisplayValue(
    "minseokim"
  );
  expect(screen.getByLabelText("시작하기")).toBeDisabled();

  await waitFor(
    () => {
      expect(
        screen.getAllByTestId("onboarding-username-suggestion")
      ).toHaveLength(3);
    },
    { timeout: SETTLE_TIMEOUT }
  );
});
