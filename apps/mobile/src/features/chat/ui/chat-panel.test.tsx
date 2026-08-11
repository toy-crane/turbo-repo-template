import { afterEach, describe, expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from "@testing-library/react-native";
import type { UIMessageChunk } from "ai";
import { simulateReadableStream } from "ai";
import { setStringAsync } from "expo-clipboard";
import { impactAsync, notificationAsync } from "expo-haptics";
import { AccessibilityInfo, BackHandler, StyleSheet } from "react-native";

import { createChatTransport } from "@/features/chat/api/chat-transport";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import { collectTestIds } from "@/shared/test/collect-test-ids";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ChatPanel, chatLabels } from "./chat-panel";

jest.mock("@/features/chat/api/chat-transport", () => ({
  createChatTransport: jest.fn(),
}));

// HeroUI Menu positions its real portal by calling the native trigger's
// `measure`. Jest host refs do not run the measure callback, so this small
// stand-in keeps the public compound API and close behavior while device tests
// cover the library's real positioning and collision code.
jest.mock("heroui-native/menu", () => {
  const React = require("react") as typeof import("react");
  const {
    BackHandler: NativeBackHandler,
    Pressable,
    Text,
    View,
  } = require("react-native") as typeof import("react-native");
  const MenuContext = React.createContext<
    { isOpen: boolean; onOpenChange: (open: boolean) => void } | undefined
  >(undefined);
  const useMenuContext = () => {
    const value = React.useContext(MenuContext);

    if (!value) {
      throw new Error("Menu mock must be used inside Menu");
    }

    return value;
  };
  const Root = ({
    children,
    isOpen = false,
    onOpenChange = () => undefined,
  }: {
    children?: React.ReactNode;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    React.createElement(
      MenuContext.Provider,
      { value: { isOpen, onOpenChange } },
      children
    );
  const Trigger = React.forwardRef(
    (
      { children }: { asChild?: boolean; children?: React.ReactNode },
      ref: React.ForwardedRef<{ close: () => void; open: () => void }>
    ) => {
      const { onOpenChange } = useMenuContext();

      React.useImperativeHandle(ref, () => ({
        close: () => onOpenChange(false),
        open: () => onOpenChange(true),
      }));

      return React.createElement(View, null, children);
    }
  );
  const Portal = ({ children }: { children?: React.ReactNode }) => {
    const { isOpen } = useMenuContext();

    return isOpen ? React.createElement(React.Fragment, null, children) : null;
  };
  const Overlay = React.forwardRef(
    (
      props: { closeOnPress?: boolean; onPress?: () => void; testID?: string },
      ref: React.ForwardedRef<React.ComponentRef<typeof Pressable>>
    ) => {
      const { onOpenChange } = useMenuContext();

      return React.createElement(Pressable, {
        ...props,
        onPress: () => {
          if (props.closeOnPress !== false) {
            onOpenChange(false);
          }
          props.onPress?.();
        },
        ref,
      });
    }
  );
  const Content = React.forwardRef(
    (
      props: React.ComponentProps<typeof View> & { presentation?: string },
      ref: React.ForwardedRef<React.ComponentRef<typeof View>>
    ) => {
      const { onOpenChange } = useMenuContext();

      React.useEffect(() => {
        const subscription = NativeBackHandler.addEventListener(
          "hardwareBackPress",
          () => {
            onOpenChange(false);
            return true;
          }
        );

        return () => subscription.remove();
      }, [onOpenChange]);

      return React.createElement(View, { ...props, ref });
    }
  );
  const Item = React.forwardRef(
    (
      props: React.ComponentProps<typeof Pressable> & { isDisabled?: boolean },
      ref: React.ForwardedRef<React.ComponentRef<typeof Pressable>>
    ) => {
      const { onOpenChange } = useMenuContext();

      return React.createElement(Pressable, {
        ...props,
        accessibilityRole: "menuitem",
        accessibilityState: { disabled: props.isDisabled ?? false },
        disabled: props.isDisabled,
        onPress: (event) => {
          props.onPress?.(event);
          onOpenChange(false);
        },
        ref,
      });
    }
  );
  const ItemTitle = (props: React.ComponentProps<typeof Text>) =>
    React.createElement(Text, props);

  return {
    Menu: Object.assign(Root, {
      Content,
      Item,
      ItemTitle,
      Overlay,
      Portal,
      Trigger,
    }),
  };
});

/**
 * The virtual list never becomes interactive under Jest: its containers wait
 * for native layout and stay behind `pointerEvents: "none"` forever, which
 * silently swallows every press inside a row. These tests are about content
 * and behavior, not virtualization — the real list runs in device
 * verification — so the mock maps the data straight through `renderItem`.
 *
 * It does keep the one part of virtualization the panel has to live with: a
 * row is cached on its key, its own item and `extraData`, and never on
 * `renderItem` identity (`react-native.mjs:5605-5607`). A row whose inputs did
 * not change keeps the element it rendered before, closures and all, so a
 * value the panel forgets to put in `extraData` goes stale here exactly as it
 * does on a device.
 */
/** The props the panel last handed the list, for the contract test below. */
const mockListProps: {
  contentContainerStyle?: unknown;
  contentInset?: unknown;
  keyboardShouldPersistTaps?: string;
  maintainScrollAtEnd?: boolean;
  maintainScrollAtEndThreshold?: number;
  maintainVisibleContentPosition?: boolean;
  onEndReached?: () => void;
  onScrollBeginDrag?: () => void;
  scrollEventThrottle?: number;
  scrollIndicatorInsets?: unknown;
} = {};
const mockScrollMessageToEnd = jest.fn(() => Promise.resolve());
const mockNativeScrollToEnd = jest.fn();
const mockNativeScrollTo = jest.fn();
const mockScrollToIndex = jest.fn(() => Promise.resolve());
const mockScrollToOffset = jest.fn(() => Promise.resolve());

jest.mock("@legendapp/list/keyboard", () => {
  const React = require("react") as typeof import("react");
  const { ScrollView } =
    require("react-native") as typeof import("react-native");

  return {
    KeyboardAwareLegendList: React.forwardRef(
      (
        props: {
          data?: { id: string }[];
          contentContainerStyle?: unknown;
          contentInset?: unknown;
          extraData?: unknown;
          keyboardShouldPersistTaps?: string;
          keyExtractor?: (item: { id: string }) => string;
          ListEmptyComponent?: React.ComponentType;
          maintainScrollAtEnd?: boolean;
          maintainScrollAtEndThreshold?: number;
          maintainVisibleContentPosition?: boolean;
          onEndReached?: () => void;
          onScrollBeginDrag?: () => void;
          scrollEventThrottle?: number;
          onLayout?: (event: unknown) => void;
          renderItem: (info: {
            index: number;
            item: unknown;
          }) => React.ReactNode;
          testID?: string;
          scrollIndicatorInsets?: unknown;
        },
        _ref
      ) => {
        mockListProps.contentContainerStyle = props.contentContainerStyle;
        mockListProps.contentInset = props.contentInset;
        mockListProps.keyboardShouldPersistTaps =
          props.keyboardShouldPersistTaps;
        mockListProps.maintainScrollAtEnd = props.maintainScrollAtEnd;
        mockListProps.maintainScrollAtEndThreshold =
          props.maintainScrollAtEndThreshold;
        mockListProps.maintainVisibleContentPosition =
          props.maintainVisibleContentPosition;
        mockListProps.onEndReached = props.onEndReached;
        mockListProps.onScrollBeginDrag = props.onScrollBeginDrag;
        mockListProps.scrollIndicatorInsets = props.scrollIndicatorInsets;
        mockListProps.scrollEventThrottle = props.scrollEventThrottle;

        React.useImperativeHandle(_ref, () => ({
          getNativeScrollRef: () => ({
            scrollTo: mockNativeScrollTo,
            scrollToEnd: mockNativeScrollToEnd,
          }),
          getState: () => ({
            contentLength: 1200,
            data: [{ id: "user" }, { id: "answer" }],
            scrollLength: 320,
          }),
          scrollToIndex: mockScrollToIndex,
          scrollToOffset: mockScrollToOffset,
        }));

        const rows = React.useRef(
          new Map<
            string,
            {
              element: React.ReactNode;
              extraData: unknown;
              item: { id: string };
            }
          >()
        );

        return React.createElement(
          ScrollView,
          { onLayout: props.onLayout, testID: props.testID },
          (props.data ?? []).length === 0 && props.ListEmptyComponent
            ? React.createElement(props.ListEmptyComponent)
            : (props.data ?? []).map((item, index) => {
                const key = props.keyExtractor?.(item) ?? item.id;
                const cached = rows.current.get(key);
                const element =
                  cached &&
                  cached.item === item &&
                  cached.extraData === props.extraData
                    ? cached.element
                    : props.renderItem({ index, item });

                rows.current.set(key, {
                  element,
                  extraData: props.extraData,
                  item,
                });

                return React.createElement(React.Fragment, { key }, element);
              })
        );
      }
    ),
    useKeyboardChatComposerInset: () => ({
      contentInsetEndAdjustment: { value: 0 },
      onComposerLayout: () => undefined,
    }),
    useKeyboardScrollToEnd: () => ({
      freeze: { value: false },
      scrollMessageToEnd: mockScrollMessageToEnd,
    }),
  };
});

/**
 * Counts how often each message's parts actually render. `MessagePart` sits
 * inside the memoized row, so a bailed-out row never reaches this wrapper —
 * which is exactly what the streaming isolation test measures.
 */
const mockPartRenderCounts = new Map<string, number>();

jest.mock("./message-parts", () => {
  const React = require("react") as typeof import("react");
  const actual = jest.requireActual(
    "./message-parts"
  ) as typeof import("./message-parts");

  return {
    MessagePart: (props: Parameters<typeof actual.MessagePart>[0]) => {
      mockPartRenderCounts.set(
        props.messageId,
        (mockPartRenderCounts.get(props.messageId) ?? 0) + 1
      );

      return React.createElement(actual.MessagePart, props);
    },
  };
});

const mockCreateChatTransport = jest.mocked(createChatTransport);

const ACCESS_TOKEN = "test-access-token";

const PART_MARKER_PATTERN = /^chat-(part|message)-/;
const USER_MESSAGE_TEST_ID = /^chat-user-message-/;

function answerStream(text: string[]): ReadableStream<UIMessageChunk> {
  const chunks: UIMessageChunk[] = [
    { type: "start" },
    { id: "0", type: "text-start" },
    ...text.map((delta) => ({ delta, id: "0", type: "text-delta" as const })),
    { id: "0", type: "text-end" },
    { type: "finish" },
  ];

  return simulateReadableStream({
    chunkDelayInMs: null,
    chunks,
    initialDelayInMs: null,
  });
}

/** A stream the test feeds by hand, for stopping and streaming mid-flight. */
function controlledStream() {
  let controller: ReadableStreamDefaultController<UIMessageChunk> | undefined;
  const stream = new ReadableStream<UIMessageChunk>({
    start(c) {
      controller = c;
    },
  });

  return {
    close: () => controller?.close(),
    fail: (cause: Error) => controller?.error(cause),
    push: (chunk: UIMessageChunk) => controller?.enqueue(chunk),
    stream,
  };
}

/**
 * Stands in for the network. `sendMessages` records every call so a test can
 * say "this was not sent" rather than only "nothing appeared on screen".
 */
function fakeTransport(
  respond: () => Promise<ReadableStream<UIMessageChunk>>
): {
  reconnectToStream: () => Promise<null>;
  sendMessages: jest.Mock<() => Promise<ReadableStream<UIMessageChunk>>>;
} {
  return {
    reconnectToStream: () => Promise.resolve(null),
    sendMessages: jest.fn(respond),
  };
}

function useTransport(transport: ReturnType<typeof fakeTransport>) {
  mockCreateChatTransport.mockReturnValue(
    transport as unknown as ReturnType<typeof createChatTransport>
  );
}

/**
 * The screen owns the session and hands it to the panel, so the test does the
 * same instead of reaching into the panel with a token prop.
 */
function TestChat({ accessToken }: { accessToken: string | undefined }) {
  const chat = useChatSession(accessToken);

  return <ChatPanel chat={chat} />;
}

function renderChat(accessToken: string | undefined) {
  return renderWithHeroUI(<TestChat accessToken={accessToken} />);
}

describe("ChatPanel", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockPartRenderCounts.clear();
    mockListProps.onEndReached = undefined;
    mockListProps.onScrollBeginDrag = undefined;
  });

  test("보낸 메시지와 생성 중 상태, 스트리밍 답변을 차례로 보여준다", async () => {
    let release: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      release = resolve;
    });
    const transport = fakeTransport(async () => {
      await started;

      return answerStream(["안녕", "하세요"]);
    });

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "안녕");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByText("안녕")).toBeOnTheScreen();
    });
    expect(screen.getByTestId("chat-generating")).toBeOnTheScreen();
    expect(
      screen.getByTestId("chat-waiting-dot", { includeHiddenElements: true })
    ).toBeOnTheScreen();
    expect(
      StyleSheet.flatten(
        screen.getByTestId("chat-waiting-dot-slot", {
          includeHiddenElements: true,
        }).props.style
      )
    ).toEqual(expect.objectContaining({ height: 24, width: 24 }));
    expect(
      StyleSheet.flatten(
        screen.getByTestId("chat-waiting-dot", {
          includeHiddenElements: true,
        }).props.style
      )
    ).toEqual(expect.objectContaining({ height: 12, width: 12 }));
    expect(screen.queryByText(chatLabels.generating)).not.toBeOnTheScreen();

    release?.();

    await waitFor(() => {
      expect(screen.getByText("안녕하세요")).toBeOnTheScreen();
    });

    expect(screen.queryByTestId("chat-generating")).not.toBeOnTheScreen();
    expect(transport.sendMessages).toHaveBeenCalledTimes(1);
  });

  test("요청이 실패하면 보낸 메시지를 남기고 다시 시도할 수 있게 한다", async () => {
    const transport = fakeTransport(() =>
      Promise.reject(new Error("network is down"))
    );

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "안녕");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByTestId("chat-error")).toBeOnTheScreen();
    });

    await waitFor(() => {
      expect(screen.getByText("안녕")).toBeOnTheScreen();
    });
    expect(screen.getByLabelText(chatLabels.retry)).toBeEnabled();
    expect(
      screen.queryByLabelText(chatLabels.copyMessage)
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText(chatLabels.regenerate)
    ).not.toBeOnTheScreen();
  });

  test("일부 답변 뒤에 실패하면 글자를 남기고 그 답변 행에는 다시 보내기만 보여준다", async () => {
    const answer = controlledStream();

    useTransport(fakeTransport(() => Promise.resolve(answer.stream)));

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    answer.push({ type: "start" });
    answer.push({ id: "0", type: "text-start" });
    answer.push({ delta: "남은 일부 답변", id: "0", type: "text-delta" });

    await waitFor(() => {
      expect(screen.getByText("남은 일부 답변")).toBeOnTheScreen();
    });

    answer.fail(new Error("stream failed"));

    await waitFor(() => {
      expect(screen.getByTestId("chat-answer-error")).toBeOnTheScreen();
    });

    expect(screen.getByText("남은 일부 답변")).toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.retry)).toBeEnabled();
    expect(
      screen.queryByLabelText(chatLabels.copyMessage)
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText(chatLabels.regenerate)
    ).not.toBeOnTheScreen();
  });

  test("다시 보내기를 누르면 실제로 다시 요청한다", async () => {
    let attempt = 0;
    const transport = fakeTransport(() => {
      attempt += 1;

      return attempt === 1
        ? Promise.reject(new Error("network is down"))
        : Promise.resolve(answerStream(["안녕하세요"]));
    });

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "안녕");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByTestId("chat-error")).toBeOnTheScreen();
    });

    await user.press(screen.getByLabelText(chatLabels.retry));

    await waitFor(() => {
      expect(screen.getByText("안녕하세요")).toBeOnTheScreen();
    });

    expect(transport.sendMessages).toHaveBeenCalledTimes(2);
  });

  test("토큰이 사라지면 다시 보내기를 막는다", async () => {
    const transport = fakeTransport(() =>
      Promise.reject(new Error("network is down"))
    );

    useTransport(transport);

    const user = userEvent.setup();

    const view = await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "안녕");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByTestId("chat-error")).toBeOnTheScreen();
    });

    // The session goes away while the error is on screen.
    await view.rerender(<TestChat accessToken={undefined} />);

    expect(screen.getByLabelText(chatLabels.retry)).toBeDisabled();
    expect(transport.sendMessages).toHaveBeenCalledTimes(1);
  });

  test("토큰이 없으면 요청을 보내지 않는다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream(["안녕하세요"]))
    );

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(undefined);

    await user.type(screen.getByLabelText(chatLabels.input), "안녕");
    await user.press(screen.getByLabelText(chatLabels.send));

    expect(transport.sendMessages).not.toHaveBeenCalled();
    expect(screen.queryByTestId("chat-message-user")).not.toBeOnTheScreen();
  });

  test("답변을 기다리는 동안 같은 입력을 다시 보내지 않는다", async () => {
    let release: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      release = resolve;
    });
    const transport = fakeTransport(async () => {
      await started;

      return answerStream(["안녕하세요"]);
    });

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "안녕");

    const send = screen.getByLabelText(chatLabels.send);

    // Two presses in the same frame, before React swaps the button to the
    // stop control: the window where only the running-request guard can
    // block the duplicate.
    await act(() => {
      fireEvent.press(send);
      fireEvent.press(send);
    });

    expect(transport.sendMessages).toHaveBeenCalledTimes(1);

    release?.();

    await waitFor(() => {
      expect(screen.getByText("안녕하세요")).toBeOnTheScreen();
    });
  });

  test("대화가 비어 있어도 목록 안에 제목과 짧은 안내를 보여준다", async () => {
    useTransport(
      fakeTransport(() => Promise.resolve(answerStream(["안녕하세요"])))
    );

    await renderChat(ACCESS_TOKEN);

    expect(screen.getByText("무엇을 도와드릴까요?")).toBeOnTheScreen();
    expect(
      screen.getByText("궁금한 것을 입력하면 AI가 바로 답해요.")
    ).toBeOnTheScreen();
    expect(screen.getByTestId("chat-list")).toBeOnTheScreen();
    expect(mockListProps.contentContainerStyle).toEqual({
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 0,
    });
    expect(mockListProps.contentInset).toBeUndefined();
    expect(mockListProps.scrollIndicatorInsets).toBeUndefined();
  });

  test("입력창은 닫힌 Safe Area와 열린 키보드 위 8 간격을 같은 높이로 유지한다", async () => {
    useTransport(
      fakeTransport(() => Promise.resolve(answerStream(["안녕하세요"])))
    );

    await renderChat(ACCESS_TOKEN);

    const sticky = screen.getByTestId("chat-keyboard-sticky");
    const composer = screen.getByTestId("chat-composer");
    const composerStyle = StyleSheet.flatten(composer.props.style);

    expect(sticky.props.offset).toEqual({ closed: 0, opened: 26 });
    expect(composerStyle).toEqual(
      expect.objectContaining({ paddingBottom: 34, paddingTop: 16 })
    );
    expect(composerStyle.backgroundColor).toBeUndefined();
  });

  test("새 질문을 헤더 아래에 두고 남은 높이를 답변 자리로 유지한다", async () => {
    const answer = controlledStream();
    let finishAnchoring: (() => void) | undefined;

    useTransport(fakeTransport(() => Promise.resolve(answer.stream)));

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByTestId("chat-latest-user-row")).toBeOnTheScreen();
    });

    mockScrollToIndex.mockImplementationOnce(() => {
      expect(
        StyleSheet.flatten(screen.getByTestId("chat-generating").props.style)
      ).toEqual(expect.objectContaining({ minHeight: 564 }));

      return new Promise<void>((resolve) => {
        finishAnchoring = resolve;
      });
    });

    await act(() => {
      fireEvent(screen.getByTestId("chat-list"), "layout", {
        nativeEvent: { layout: { height: 800, width: 400, x: 0, y: 0 } },
      });
      fireEvent(screen.getByTestId("chat-composer"), "layout", {
        nativeEvent: { layout: { height: 120, width: 400, x: 0, y: 0 } },
      });
      fireEvent(screen.getByTestId("chat-latest-user-row"), "layout", {
        nativeEvent: { layout: { height: 100, width: 360, x: 20, y: 16 } },
      });
    });

    await waitFor(() => {
      expect(mockScrollToIndex).toHaveBeenCalledWith({
        animated: true,
        index: 0,
        viewOffset: 16,
        viewPosition: 0,
      });
    });
    expect(mockListProps.maintainScrollAtEnd).toBe(false);

    await act(() => {
      finishAnchoring?.();
    });
    await waitFor(() => {
      expect(mockListProps.maintainScrollAtEnd).toBe(true);
    });

    expect(
      StyleSheet.flatten(screen.getByTestId("chat-generating").props.style)
    ).toEqual(expect.objectContaining({ minHeight: 564 }));
  });

  test("최신 메시지 버튼은 가운데에서 입력창 위를 따르고 키보드를 닫지 않는다", async () => {
    useTransport(
      fakeTransport(() => Promise.resolve(answerStream(["안녕하세요"])))
    );

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await act(() => {
      mockListProps.onScrollBeginDrag?.();
    });

    const container = screen.getByTestId("chat-scroll-to-latest-container");

    expect(StyleSheet.flatten(container.props.style)).toEqual(
      expect.objectContaining({ height: 56 })
    );
    expect(StyleSheet.flatten(container.props.style).top).toBeUndefined();

    await user.press(screen.getByLabelText(chatLabels.scrollToLatest));

    expect(mockScrollToOffset).toHaveBeenCalledWith({
      animated: true,
      offset: 880,
    });
    expect(mockNativeScrollTo).not.toHaveBeenCalled();
    expect(mockScrollToIndex).not.toHaveBeenCalled();
    expect(mockNativeScrollToEnd).not.toHaveBeenCalled();
    expect(mockScrollMessageToEnd).not.toHaveBeenCalled();
    expect(mockListProps.maintainVisibleContentPosition).toBe(false);
    expect(mockListProps.maintainScrollAtEndThreshold).toBe(
      Number.POSITIVE_INFINITY
    );
    expect(mockListProps.scrollEventThrottle).toBe(50);

    await act(() => {
      mockListProps.onEndReached?.();
    });
    expect(mockListProps.maintainScrollAtEndThreshold).toBe(0.15);
    expect(mockListProps.maintainVisibleContentPosition).toBe(true);
  });

  test("공백뿐인 메시지는 보내지 않는다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream(["안녕하세요"]))
    );

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "   ");
    await user.press(screen.getByLabelText(chatLabels.send));

    expect(transport.sendMessages).not.toHaveBeenCalled();
    expect(screen.getByText("무엇을 도와드릴까요?")).toBeOnTheScreen();
  });

  test("생성 중에는 전송 버튼이 생성 중지 버튼으로 바뀐다", async () => {
    let release: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      release = resolve;
    });
    const transport = fakeTransport(async () => {
      await started;

      return answerStream(["안녕하세요"]);
    });

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "안녕");
    await user.press(screen.getByLabelText(chatLabels.send));

    expect(screen.getByLabelText(chatLabels.stop)).toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.stop)).toBeEnabled();
    expect(screen.queryByTestId("chat-send")).not.toBeOnTheScreen();
    expect(
      within(screen.getByTestId("chat-composer")).queryByTestId(
        "chat-generating"
      )
    ).not.toBeOnTheScreen();

    release?.();

    await waitFor(() => {
      expect(screen.getByLabelText(chatLabels.send)).toBeOnTheScreen();
    });
    expect(screen.queryByTestId("chat-stop")).not.toBeOnTheScreen();
  });

  test("생성을 중지하면 그때까지 받은 답변을 남기고 입력 가능한 상태로 돌아간다", async () => {
    const answer = controlledStream();
    const transport = fakeTransport(() => Promise.resolve(answer.stream));

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "안녕");
    await user.press(screen.getByLabelText(chatLabels.send));

    answer.push({ type: "start" });
    answer.push({ id: "0", type: "text-start" });
    answer.push({ delta: "부분 답변", id: "0", type: "text-delta" });

    await waitFor(() => {
      expect(screen.getByText("부분 답변")).toBeOnTheScreen();
    });
    expect(
      screen.queryByTestId("chat-waiting-dot", {
        includeHiddenElements: true,
      })
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId("chat-streaming-cursor", {
        includeHiddenElements: true,
      })
    ).toBeOnTheScreen();

    await user.press(screen.getByLabelText(chatLabels.stop));

    await waitFor(() => {
      expect(screen.getByLabelText(chatLabels.send)).toBeOnTheScreen();
    });

    // The partial answer stays, and nothing reads as a failure.
    expect(screen.getByText("부분 답변")).toBeOnTheScreen();
    expect(screen.queryByTestId("chat-error")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("chat-generating")).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId("chat-streaming-cursor", {
        includeHiddenElements: true,
      })
    ).not.toBeOnTheScreen();
    expect(screen.getAllByLabelText(chatLabels.copyMessage)).toHaveLength(1);
    expect(screen.getByLabelText(chatLabels.regenerate)).toBeEnabled();
  });

  test("첫 답변 전에 중지하면 빈 답변 행만 없애고 오류를 만들지 않는다", async () => {
    const answer = controlledStream();

    useTransport(fakeTransport(() => Promise.resolve(answer.stream)));

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(
        screen.getByTestId("chat-waiting-dot", {
          includeHiddenElements: true,
        })
      ).toBeOnTheScreen();
    });

    await user.press(screen.getByLabelText(chatLabels.stop));

    await waitFor(() => {
      expect(
        screen.queryByTestId("chat-waiting-dot", {
          includeHiddenElements: true,
        })
      ).not.toBeOnTheScreen();
    });

    expect(screen.queryByTestId("chat-error")).not.toBeOnTheScreen();
    expect(screen.getByText("질문")).toBeOnTheScreen();
  });

  test("가짜 스트림의 텍스트, 파일, 출처, 도구 part가 종류와 순서를 유지한다", async () => {
    const chunks: UIMessageChunk[] = [
      { type: "start" },
      { id: "0", type: "text-start" },
      { delta: "먼저 설명", id: "0", type: "text-delta" },
      { id: "0", type: "text-end" },
      {
        mediaType: "application/pdf",
        type: "file",
        url: "https://example.com/a.pdf",
      },
      {
        sourceId: "s1",
        title: "출처 하나",
        type: "source-url",
        url: "https://example.com/one",
      },
      {
        input: {},
        toolCallId: "t1",
        toolName: "search",
        type: "tool-input-available",
      },
      { output: "찾음", toolCallId: "t1", type: "tool-output-available" },
      { id: "1", type: "text-start" },
      { delta: "마지막 정리", id: "1", type: "text-delta" },
      { id: "1", type: "text-end" },
      { type: "finish" },
    ];
    const transport = fakeTransport(() =>
      Promise.resolve(
        simulateReadableStream({
          chunkDelayInMs: null,
          chunks,
          initialDelayInMs: null,
        })
      )
    );

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "혼합 스트림");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByText("마지막 정리")).toBeOnTheScreen();
    });

    const markers = [
      "chat-part-file",
      "chat-part-source-url",
      "chat-part-tool-search",
      "chat-message-assistant",
    ];

    expect(
      collectTestIds(PART_MARKER_PATTERN, (testId) => markers.includes(testId))
    ).toEqual([
      "chat-message-assistant",
      "chat-part-file",
      "chat-part-source-url",
      "chat-part-tool-search",
      "chat-message-assistant",
    ]);
  });

  test("AI 복사는 같은 크기의 체크 아이콘으로 2초 동안 바뀐다", async () => {
    jest.useFakeTimers();

    const transport = fakeTransport(() =>
      Promise.resolve(answerStream(["복사할 답변"]))
    );

    useTransport(transport);

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "복사할 질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByText("복사할 답변")).toBeOnTheScreen();
    });

    const copyButton = screen.getByLabelText(chatLabels.copyMessage);

    expect(copyButton.props.className).toContain("h-11 w-11");
    expect(screen.getByTestId("chat-ai-copy-icon").props.size).toBe(20);

    await user.press(copyButton);

    expect(jest.mocked(setStringAsync)).toHaveBeenCalledWith("복사할 답변");
    await waitFor(() => {
      expect(screen.getByLabelText(chatLabels.copied)).toBeOnTheScreen();
    });

    expect(screen.getByTestId("chat-ai-copy-check").props.size).toBe(20);
    expect(screen.queryByText(chatLabels.copied)).not.toBeOnTheScreen();

    await act(() => jest.advanceTimersByTime(1999));
    expect(screen.getByLabelText(chatLabels.copied)).toBeOnTheScreen();

    await act(() => jest.advanceTimersByTime(1));
    expect(screen.getByLabelText(chatLabels.copyMessage)).toBeOnTheScreen();
  });

  test("사용자 말풍선은 짧게 누르면 그대로이고 길게 누르면 닫을 수 있는 메뉴를 연다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream(["AI 답변"]))
    );
    const addBackHandler = jest.spyOn(BackHandler, "addEventListener");

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);
    await user.type(screen.getByLabelText(chatLabels.input), "사용자 질문");
    await user.press(screen.getByLabelText(chatLabels.send));
    await waitFor(() => expect(screen.getByText("AI 답변")).toBeOnTheScreen());

    const userBubble = screen.getByTestId(USER_MESSAGE_TEST_ID);

    fireEvent.press(userBubble);
    expect(
      screen.queryByText(chatLabels.copyUserMessage)
    ).not.toBeOnTheScreen();
    expect(jest.mocked(impactAsync)).not.toHaveBeenCalled();

    fireEvent(userBubble, "longPress");

    await waitFor(() => {
      expect(screen.getByText(chatLabels.copyUserMessage)).toBeOnTheScreen();
      expect(screen.getByText(chatLabels.editMessage)).toBeOnTheScreen();
    });
    expect(jest.mocked(impactAsync)).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("chat-user-menu").props.avoidCollisions).toBe(
      true
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("chat-user-menu-overlay"));
    });
    await waitFor(() =>
      expect(
        screen.queryByText(chatLabels.copyUserMessage)
      ).not.toBeOnTheScreen()
    );

    fireEvent(userBubble, "longPress");
    await waitFor(() =>
      expect(screen.getByText(chatLabels.copyUserMessage)).toBeOnTheScreen()
    );

    const backPress = [...addBackHandler.mock.calls]
      .reverse()
      .find(([event]) => event === "hardwareBackPress")?.[1];

    expect(backPress).toBeDefined();
    await act(() => backPress?.({} as never));
    await waitFor(() =>
      expect(
        screen.queryByText(chatLabels.copyUserMessage)
      ).not.toBeOnTheScreen()
    );

    fireEvent(screen.getByTestId("chat-message-assistant"), "longPress");
    expect(
      screen.queryByText(chatLabels.copyUserMessage)
    ).not.toBeOnTheScreen();

    addBackHandler.mockRestore();
  });

  test("생성 중 사용자 메뉴는 복사와 접근성 복사는 허용하고 수정은 막는다", async () => {
    const answer = controlledStream();
    const transport = fakeTransport(() => Promise.resolve(answer.stream));
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);
    await user.type(screen.getByLabelText(chatLabels.input), "복사할 질문");
    await user.press(screen.getByLabelText(chatLabels.send));
    await waitFor(() =>
      expect(screen.getByTestId(USER_MESSAGE_TEST_ID)).toBeOnTheScreen()
    );

    const userBubble = screen.getByTestId(USER_MESSAGE_TEST_ID);

    fireEvent(userBubble, "longPress");
    await waitFor(() =>
      expect(screen.getByText(chatLabels.copyUserMessage)).toBeOnTheScreen()
    );

    expect(screen.getByLabelText(chatLabels.copyUserMessage)).toBeEnabled();
    expect(screen.getByLabelText(chatLabels.editMessage)).toBeDisabled();

    await user.press(screen.getByLabelText(chatLabels.copyUserMessage));

    expect(jest.mocked(setStringAsync)).toHaveBeenCalledWith("복사할 질문");
    await waitFor(() => {
      expect(jest.mocked(notificationAsync)).toHaveBeenCalledWith("success");
      expect(announce).toHaveBeenCalledWith(chatLabels.copied);
    });
    expect(
      screen.queryByText(chatLabels.copyUserMessage)
    ).not.toBeOnTheScreen();

    fireEvent(userBubble, "accessibilityAction", {
      nativeEvent: { actionName: "copy" },
    });
    await waitFor(() =>
      expect(jest.mocked(setStringAsync)).toHaveBeenCalledTimes(2)
    );

    fireEvent(userBubble, "accessibilityAction", {
      nativeEvent: { actionName: "edit" },
    });
    expect(screen.queryByLabelText(chatLabels.editInput)).not.toBeOnTheScreen();

    announce.mockRestore();
  });

  test("입력창에서 return 키로도 보낸다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream(["답변"]))
    );

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    const input = screen.getByLabelText(chatLabels.input);

    await user.type(input, "질문");

    // 여러 줄 입력창은 기본적으로 return을 줄바꿈으로 삼켜 onSubmitEditing을
    // 부르지 않는다. 이 설정이 없으면 하드웨어 키보드에서 보낼 방법이 없다.
    expect(input.props.submitBehavior).toBe("submit");

    fireEvent(input, "submitEditing");

    await waitFor(() => {
      expect(transport.sendMessages).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("질문")).toBeOnTheScreen();
  });

  test("생성 시작과 실패를 화면 낭독기에 한 번씩 알린다", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");

    useTransport(fakeTransport(() => Promise.reject(new Error("network"))));

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByTestId("chat-error")).toBeOnTheScreen();
    });

    // accessibilityRole="alert"는 React Native에서 아무 알림도 만들지 않는다.
    expect(
      announce.mock.calls.filter(
        ([message]) => message === chatLabels.generating
      )
    ).toHaveLength(1);
    expect(
      announce.mock.calls.filter(
        ([message]) => message === chatLabels.errorAnnouncement
      )
    ).toHaveLength(1);

    announce.mockRestore();
  });

  test("키보드가 열려 있어도 목록 안 버튼이 한 번에 눌리게 한다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream(["답변"]))
    );

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByText("답변")).toBeOnTheScreen();
    });

    // 실제 목록만 아는 동작이라 화면으로는 확인할 수 없다. React Native 기본값
    // "never"는 키보드가 열린 동안 첫 탭을 키보드 닫기에 써버리고, 메시지 작업
    // 버튼은 모두 이 목록 안에 있다.
    expect(mockListProps.keyboardShouldPersistTaps).toBe("handled");
  });

  test("과거 사용자 메시지를 그 자리에서 취소하거나 고쳐 보낸다", async () => {
    let attempt = 0;
    const transport = fakeTransport(() => {
      attempt += 1;

      return Promise.resolve(answerStream([`답변 ${attempt}`]));
    });

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "첫 질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByText("답변 1")).toBeOnTheScreen();
    });

    await user.type(screen.getByLabelText(chatLabels.input), "둘째 질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByText("답변 2")).toBeOnTheScreen();
    });

    const userBubbles = screen.getAllByTestId(USER_MESSAGE_TEST_ID);

    expect(userBubbles).toHaveLength(2);

    await user.type(screen.getByLabelText(chatLabels.input), "쓰다 만 초안");
    fireEvent(userBubbles[0] as never, "longPress");
    await user.press(await screen.findByLabelText(chatLabels.editMessage));

    const inlineInput = screen.getByLabelText(chatLabels.editInput);

    expect(inlineInput).toHaveDisplayValue("첫 질문");
    expect(inlineInput.props.autoFocus).toBe(true);
    expect(screen.getByText("답변 1")).toBeOnTheScreen();
    expect(screen.getByText("둘째 질문")).toBeOnTheScreen();
    expect(screen.getByText("답변 2")).toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.input)).toHaveDisplayValue(
      "쓰다 만 초안"
    );
    expect(screen.getByLabelText(chatLabels.input).props.editable).toBe(false);
    expect(screen.getByLabelText(chatLabels.send)).toBeDisabled();
    expect(screen.queryByText("메시지를 고치는 중")).not.toBeOnTheScreen();

    await user.press(screen.getByLabelText(chatLabels.cancelEdit));

    expect(screen.queryByLabelText(chatLabels.editInput)).not.toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.input)).toHaveDisplayValue(
      "쓰다 만 초안"
    );
    expect(screen.getByText("첫 질문")).toBeOnTheScreen();
    expect(screen.getByText("답변 2")).toBeOnTheScreen();

    const [restoredFirstBubble] = screen.getAllByTestId(USER_MESSAGE_TEST_ID);

    fireEvent(restoredFirstBubble as never, "accessibilityAction", {
      nativeEvent: { actionName: "edit" },
    });

    const reopenedInput = await screen.findByLabelText(chatLabels.editInput);

    await user.clear(reopenedInput);
    await user.type(reopenedInput, "고친 첫 질문");
    await user.press(screen.getByLabelText(chatLabels.sendEdit));

    await waitFor(() => expect(screen.getByText("답변 3")).toBeOnTheScreen());
    expect(screen.getByText("고친 첫 질문")).toBeOnTheScreen();
    expect(screen.queryByText("둘째 질문")).not.toBeOnTheScreen();
    expect(screen.queryByText("답변 2")).not.toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.input).props.editable).toBe(true);
  });

  test("마지막 AI 답변에만 다시 생성이 보이고 누르면 재요청한다", async () => {
    let attempt = 0;
    const transport = fakeTransport(() => {
      attempt += 1;

      return Promise.resolve(answerStream([`답변 ${attempt}`]));
    });

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "첫 질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByText("답변 1")).toBeOnTheScreen();
    });

    expect(screen.getAllByLabelText(chatLabels.regenerate)).toHaveLength(1);

    await user.press(screen.getByLabelText(chatLabels.regenerate));

    await waitFor(() => {
      expect(screen.getByText("답변 2")).toBeOnTheScreen();
    });

    expect(transport.sendMessages).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("답변 1")).not.toBeOnTheScreen();
  });

  test("생성 중에는 다시 생성이 비활성이다", async () => {
    const answer = controlledStream();
    const transport = fakeTransport(() => Promise.resolve(answer.stream));

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    answer.push({ type: "start" });
    answer.push({ id: "0", type: "text-start" });
    answer.push({ delta: "진행 중", id: "0", type: "text-delta" });

    await waitFor(() => {
      expect(screen.getByText("진행 중")).toBeOnTheScreen();
    });

    expect(screen.getByLabelText(chatLabels.regenerate)).toBeDisabled();

    answer.push({ id: "0", type: "text-end" });
    answer.push({ type: "finish" });
    answer.close();

    await waitFor(() => {
      expect(screen.getByLabelText(chatLabels.regenerate)).toBeEnabled();
    });
  });

  test("스트리밍 중에는 스트리밍 중인 메시지 행만 다시 렌더링한다", async () => {
    let attempt = 0;
    const second = controlledStream();
    const transport = fakeTransport(() => {
      attempt += 1;

      return attempt === 1
        ? Promise.resolve(answerStream(["첫 답변"]))
        : Promise.resolve(second.stream);
    });

    useTransport(transport);

    const user = userEvent.setup();

    await renderChat(ACCESS_TOKEN);

    await user.type(screen.getByLabelText(chatLabels.input), "첫 질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByText("첫 답변")).toBeOnTheScreen();
    });

    await user.type(screen.getByLabelText(chatLabels.input), "둘째 질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    second.push({ type: "start" });
    second.push({ id: "0", type: "text-start" });
    second.push({ delta: "둘째", id: "0", type: "text-delta" });

    await waitFor(() => {
      expect(screen.getByText("둘째")).toBeOnTheScreen();
    });

    // From here on the only thing happening is streaming chunks: the send
    // itself (which legitimately re-renders rows once for the action locks)
    // is behind us, and the finish transition comes after the measurement.
    const baseline = new Map(mockPartRenderCounts);

    expect(baseline.size).toBeGreaterThan(0);

    second.push({ delta: " 답변", id: "0", type: "text-delta" });

    await waitFor(() => {
      expect(screen.getByText("둘째 답변")).toBeOnTheScreen();
    });

    second.push({ delta: " 계속", id: "0", type: "text-delta" });

    await waitFor(() => {
      expect(screen.getByText("둘째 답변 계속")).toBeOnTheScreen();
    });

    // Only the streaming message's row rendered again.
    const grown = [...mockPartRenderCounts].filter(
      ([messageId, count]) => count !== baseline.get(messageId)
    );

    expect(grown).toHaveLength(1);

    second.push({ id: "0", type: "text-end" });
    second.push({ type: "finish" });
    second.close();

    await waitFor(() => {
      expect(screen.queryByTestId("chat-generating")).not.toBeOnTheScreen();
    });
  });
});
