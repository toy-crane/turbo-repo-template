import { beforeEach, expect, jest, test } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { useNavigation } from "expo-router";

import { useFocusOnArrival, useScreenArrival } from "./use-screen-arrival";

jest.mock("expo-router", () => ({
  ...(jest.requireActual("expo-router") as object),
  useNavigation: jest.fn(),
}));

const mockUseNavigation = jest.mocked(useNavigation);

type TransitionListener = (payload: { data?: { closing?: boolean } }) => void;

/** Stands in for the native stack and replays its `transitionEnd` event. */
function stubNavigation() {
  const listeners: TransitionListener[] = [];

  mockUseNavigation.mockReturnValue({
    addListener: (_event: string, listener: TransitionListener) => {
      listeners.push(listener);

      return () => listeners.splice(listeners.indexOf(listener), 1);
    },
  });

  return {
    endTransition: (payload: { data?: { closing?: boolean } }) =>
      act(() => {
        for (const listener of listeners) {
          listener(payload);
        }
      }),
  };
}

function control() {
  return { focus: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("들어오는 전환이 끝나야 도착으로 본다", async () => {
  const transition = stubNavigation();
  const { result } = await renderHook(() => useScreenArrival());

  expect(result.current).toBe(false);

  await transition.endTransition({ data: { closing: false } });

  expect(result.current).toBe(true);
});

test("화면을 닫는 전환은 도착이 아니다", async () => {
  const transition = stubNavigation();
  const { result } = await renderHook(() => useScreenArrival());

  await transition.endTransition({ data: { closing: true } });

  expect(result.current).toBe(false);
});

// The payload comes from someone else's event, so a reshaped one should still
// leave the person with a keyboard rather than none.
test("전환 payload가 비어 있으면 도착으로 본다", async () => {
  const transition = stubNavigation();
  const { result } = await renderHook(() => useScreenArrival());

  await transition.endTransition({});

  expect(result.current).toBe(true);
});

test("도착하면 붙어 있던 입력이 포커스를 받는다", async () => {
  const transition = stubNavigation();
  const { result } = await renderHook(() =>
    useFocusOnArrival<{ focus: () => void }>()
  );
  const input = control();

  await act(() => {
    result.current(input);
  });

  expect(input.focus).not.toHaveBeenCalled();

  await transition.endTransition({ data: { closing: false } });

  expect(input.focus).toHaveBeenCalledTimes(1);
});

test("도착한 뒤 새 입력이 붙으면 그 입력이 포커스를 받는다", async () => {
  const transition = stubNavigation();
  const { result } = await renderHook(() =>
    useFocusOnArrival<{ focus: () => void }>()
  );
  const first = control();

  await act(() => {
    result.current(first);
  });
  await transition.endTransition({ data: { closing: false } });

  const remounted = control();

  await act(() => {
    result.current(null);
    result.current(remounted);
  });

  expect(remounted.focus).toHaveBeenCalledTimes(1);
  expect(first.focus).toHaveBeenCalledTimes(1);
});

test("도착 전에는 입력이 바뀌어도 포커스를 요청하지 않는다", async () => {
  stubNavigation();
  const { result } = await renderHook(() =>
    useFocusOnArrival<{ focus: () => void }>()
  );
  const input = control();

  await act(() => {
    result.current(input);
  });

  expect(input.focus).not.toHaveBeenCalled();
});
