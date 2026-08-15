import { afterEach, describe, expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  screen,
  userEvent,
  within,
} from "@testing-library/react-native";
import type { UIMessage } from "ai";
import { setStringAsync } from "expo-clipboard";
import { useState } from "react";
import { AccessibilityInfo, StyleSheet } from "react-native";
import { KeyboardController } from "react-native-keyboard-controller";

import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ChatPanel, chatLabels } from "./chat-panel";

const mockScrollToEnd = jest.fn<
  (options?: { animated?: boolean }) => Promise<void>
>(() => Promise.resolve());

interface MockAnchoredEndSpace {
  anchorIndex: number;
  anchorOffset: number;
  onReady?: (info: {
    anchorIndex: number | undefined;
    anchorKey: string | undefined;
    size: number;
  }) => void;
}

jest.mock("@legendapp/list/keyboard", () => {
  const React = require("react") as typeof import("react");
  const { KeyboardController: keyboardController } =
    require("react-native-keyboard-controller") as typeof import("react-native-keyboard-controller");
  const { View } = require("react-native") as typeof import("react-native");

  type MockListProps = React.ComponentProps<typeof View> & {
    applyWorkaroundForContentInsetHitTestBug?: boolean;
    anchoredEndSpace?: MockAnchoredEndSpace;
    contentContainerStyle?: unknown;
    contentInsetEndAdjustment?: unknown;
    data: UIMessage[];
    freeze?: unknown;
    keyboardDismissMode?: unknown;
    keyboardLiftBehavior?: unknown;
    keyboardOffset?: unknown;
    keyboardShouldPersistTaps?: unknown;
    keyExtractor: (item: UIMessage) => string;
    ListFooterComponent?: React.ReactNode;
    ListHeaderComponent?: React.ReactNode;
    maintainScrollAtEnd?: unknown;
    maintainScrollAtEndThreshold?: unknown;
    maintainVisibleContentPosition?: unknown;
    onEndVisible?: (visible: boolean) => void;
    recycleItems?: unknown;
    renderItem: (info: {
      data: UIMessage[];
      extraData: unknown;
      index: number;
      item: UIMessage;
      type: string | undefined;
    }) => React.ReactNode;
    scrollEventThrottle?: unknown;
  };
  interface MockListRef {
    reportContentInset: (inset: { bottom: number }) => void;
    scrollToEnd: (options?: { animated?: boolean }) => Promise<void>;
  }

  const KeyboardAwareLegendList = React.forwardRef<MockListRef, MockListProps>(
    (props, ref) => {
      const {
        data,
        keyExtractor,
        ListFooterComponent,
        ListHeaderComponent,
        renderItem,
        ...viewProps
      } = props;
      const scrollToEnd = React.useCallback(
        (options?: { animated?: boolean }) => mockScrollToEnd(options),
        []
      );

      React.useImperativeHandle(
        ref,
        () => ({ reportContentInset: jest.fn(), scrollToEnd }),
        [scrollToEnd]
      );

      return React.createElement(
        View,
        { ...viewProps, data, keyExtractor } as React.ComponentProps<
          typeof View
        >,
        ListHeaderComponent,
        ...data.map((item, index) =>
          React.createElement(
            React.Fragment,
            { key: keyExtractor(item) },
            renderItem({
              data,
              extraData: undefined,
              index,
              item,
              type: undefined,
            })
          )
        ),
        ListFooterComponent
      );
    }
  );

  return {
    KeyboardAwareLegendList,
    useKeyboardChatComposerInset: () => ({
      contentInsetEndAdjustment: { value: 0 },
      onComposerLayout: jest.fn(),
    }),
    useKeyboardScrollToEnd: ({
      listRef,
    }: {
      listRef: React.RefObject<{
        scrollToEnd: (options?: { animated?: boolean }) => Promise<void>;
      } | null>;
    }) => {
      const freeze = React.useRef({ value: false }).current;
      const scrollMessageToEnd = React.useCallback(
        async ({
          animated,
          closeKeyboard,
        }: {
          animated: boolean;
          closeKeyboard: boolean;
        }) => {
          if (closeKeyboard) {
            await keyboardController.dismiss();
          }
          await listRef.current?.scrollToEnd({ animated });
        },
        [listRef]
      );

      return { freeze, scrollMessageToEnd };
    },
  };
});

/**
 * The menu stands in for HeroUI's, which cannot show itself here: its content
 * lives in a portal host the raw test provider does not mount, and it will
 * not place itself until the trigger reports a measurement Jest never makes.
 * The stand-in keeps the part this panel owns — a long press asks the trigger
 * to open, and the items call back — and leaves the real gesture, placement
 * and outside-press to the device checks the spec lists.
 */
jest.mock("heroui-native/menu", () => {
  const React = require("react") as typeof import("react");
  const { Pressable, Text, View } =
    require("react-native") as typeof import("react-native");

  const OpenContext = React.createContext<{
    isOpen: boolean;
    open: () => void;
  }>({ isOpen: false, open: () => undefined });

  function Root({ children, ...viewProps }: React.ComponentProps<typeof View>) {
    const [isOpen, setIsOpen] = React.useState(false);
    const value = React.useMemo(
      () => ({ isOpen, open: () => setIsOpen(true) }),
      [isOpen]
    );

    return React.createElement(
      OpenContext.Provider,
      { value },
      React.createElement(View, viewProps, children)
    );
  }

  const Trigger = React.forwardRef<
    { open: () => void },
    { asChild?: boolean; children: React.ReactElement }
  >(({ children }, ref) => {
    const { open } = React.useContext(OpenContext);

    React.useImperativeHandle(ref, () => ({ open }), [open]);

    return children;
  });

  function Portal({ children }: { children: React.ReactNode }) {
    const { isOpen } = React.useContext(OpenContext);

    return isOpen ? React.createElement(React.Fragment, null, children) : null;
  }

  return {
    Menu: Object.assign(Root, {
      Content: ({ children }: { children: React.ReactNode }) =>
        React.createElement(View, { testID: "chat-message-menu" }, children),
      Item: Pressable,
      ItemDescription: Text,
      ItemTitle: Text,
      Overlay: () => null,
      Portal,
      Trigger,
    }),
  };
});

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
}));

const mockSetStringAsync = jest.mocked(setStringAsync);

function textMessage(
  id: string,
  role: "assistant" | "user",
  text: string
): UIMessage {
  return { id, parts: [{ text, type: "text" }], role };
}

function chatSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    beginEdit: jest.fn(),
    cancelEdit: jest.fn(),
    draft: "",
    editingMessageId: undefined,
    error: undefined,
    isBusy: false,
    messages: [],
    regenerateAnswer: jest.fn(),
    retry: jest.fn(),
    send: jest.fn(),
    setDraft: jest.fn(),
    stop: jest.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function EditableChat({ onSend }: { onSend: () => void }) {
  const [draft, setDraft] = useState("");

  return <ChatPanel chat={chatSession({ draft, send: onSend, setDraft })} />;
}

/**
 * A panel whose send actually puts the question in the conversation, which is
 * what a message coming in from below depends on.
 */
function SendingChat({
  editingMessageId,
  messages: initialMessages = [],
}: {
  editingMessageId?: string;
  messages?: UIMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const send = () =>
    setMessages((current) => {
      const kept = editingMessageId
        ? current.slice(
            0,
            current.findIndex((message) => message.id === editingMessageId)
          )
        : current;

      return [...kept, textMessage(`sent-${kept.length}`, "user", "새 질문")];
    });

  return (
    <ChatPanel
      chat={chatSession({ draft: "새 질문", editingMessageId, messages, send })}
    />
  );
}

/** The items this app adds to an answer's own system selection menu. */
function selectionMenuItems(answer: {
  props: {
    contextMenuItems?: {
      onPress: (event: {
        selection: { end: number; start: number };
        text: string;
      }) => void;
      text: string;
      visible?: boolean;
    }[];
  };
}) {
  return answer.props.contextMenuItems ?? [];
}

function sideChatEntry(id: string, phrase: string, lastLine: string) {
  return { id, lastLine, phrase };
}

/** Which rows carry an entry animation, in list order. */
function enteringRows() {
  return screen
    .getAllByTestId("chat-message-row")
    .map((row) => row.props.entering !== undefined);
}

/**
 * The long press asks the trigger to open through a ref rather than through
 * state React already knows about, so the flush has to be asked for.
 */
async function longPressMessage() {
  await act(() => {
    fireEvent(screen.getByTestId("chat-message-user"), "longPress");
  });
}

async function scrollAwayFromLatest() {
  const list = screen.getByTestId("chat-list");

  await act(() => {
    list.props.onScrollBeginDrag({
      nativeEvent: { contentOffset: { y: 240 } },
    });
    list.props.onScroll({
      nativeEvent: {
        contentInset: { bottom: 0 },
        contentOffset: { y: 160 },
        contentSize: { height: 800 },
        layoutMeasurement: { height: 400 },
      },
    });
  });
}

describe("ChatPanel", () => {
  afterEach(() => {
    mockScrollToEnd.mockClear();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test("대화가 비어 있으면 메시지 목록과 입력·전송만 보여준다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} />);

    expect(screen.getByTestId("chat-list")).toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.input)).toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.send)).toBeDisabled();
    expect(screen.queryByLabelText(chatLabels.latest)).not.toBeOnTheScreen();
    expect(screen.queryByText("무엇을 도와드릴까요?")).not.toBeOnTheScreen();
  });

  // Focusing at mount makes iOS carry the rising keyboard along with the push
  // animation, so it enters from the right while the composer climbs from the
  // bottom. The screen decides when to focus instead; see
  // docs/decisions/mobile-keyboard-entry-focus.md.
  test("입력창은 mount 시점에 스스로 포커스를 잡지 않는다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} />);

    expect(screen.getByLabelText(chatLabels.input).props.autoFocus).toBeFalsy();
  });

  test("메시지는 투명한 헤더 아래에 12px 간격을 둔다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} topInset={116} />);

    const list = screen.getByTestId("chat-list");

    expect(StyleSheet.flatten(list.props.contentContainerStyle)).toMatchObject({
      paddingTop: 128,
    });
    expect(list.props.contentInsetAdjustmentBehavior).toBe("never");
  });

  test("키보드가 열리면 입력창 아래에 8px 간격을 둔다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} />);

    expect(screen.getByTestId("chat-composer").parent?.props.offset).toEqual({
      closed: 0,
      opened: 26,
    });
  });

  test("하단 안전 영역이 없어도 키보드와 입력창 사이를 8px 띄운다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} />, {
      safeAreaBottomInset: 0,
    });

    expect(screen.getByTestId("chat-composer").parent?.props.offset).toEqual({
      closed: 0,
      opened: 4,
    });
  });

  test("AI 답변만 Markdown 렌더러로 보내고 질문은 일반 텍스트로 둔다", async () => {
    const messages = [
      textMessage("user-1", "user", "질문"),
      textMessage("assistant-1", "assistant", "# 제목 **강조**"),
    ];

    await renderWithHeroUI(<ChatPanel chat={chatSession({ messages })} />);

    expect(screen.getByTestId("chat-message-assistant").props.markdown).toBe(
      "# 제목 **강조**"
    );
    expect(screen.getByText("질문")).toBeOnTheScreen();
    expect(
      screen.getByTestId("chat-message-user").props.markdown
    ).toBeUndefined();
  });

  test("텍스트가 아닌 응답 part는 표시하지 않는다", async () => {
    const message: UIMessage = {
      id: "assistant-1",
      parts: [
        {
          mediaType: "application/pdf",
          type: "file",
          url: "https://example.com/document.pdf",
        },
        {
          sourceId: "source-1",
          title: "문서 출처",
          type: "source-url",
          url: "https://example.com/source",
        },
        { text: "일반 텍스트", type: "text" },
      ],
      role: "assistant",
    };

    await renderWithHeroUI(
      <ChatPanel chat={chatSession({ messages: [message] })} />
    );

    expect(screen.getByText("일반 텍스트")).toBeOnTheScreen();
    expect(screen.queryByText("문서 출처")).not.toBeOnTheScreen();
  });

  test("텍스트가 없는 응답은 빈 메시지 행도 만들지 않는다", async () => {
    const message: UIMessage = {
      id: "assistant-1",
      parts: [
        {
          mediaType: "application/pdf",
          type: "file",
          url: "https://example.com/document.pdf",
        },
      ],
      role: "assistant",
    };

    await renderWithHeroUI(
      <ChatPanel chat={chatSession({ messages: [message] })} />
    );

    expect(
      screen.queryByTestId("chat-message-assistant")
    ).not.toBeOnTheScreen();
  });

  test("완료된 답변 아래에 복사와 다시 받기를 보여 준다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [
            textMessage("user-1", "user", "질문"),
            textMessage("assistant-1", "assistant", "답변"),
          ],
        })}
      />
    );

    expect(screen.getByLabelText(chatLabels.copyAnswer)).toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.regenerate)).toBeOnTheScreen();
  });

  test("받는 중인 답변에는 아이콘 줄을 붙이지 않는다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          isBusy: true,
          messages: [
            textMessage("user-1", "user", "질문"),
            textMessage("assistant-1", "assistant", "받는 중"),
          ],
        })}
      />
    );

    expect(
      screen.queryByLabelText(chatLabels.copyAnswer)
    ).not.toBeOnTheScreen();
  });

  test("앞선 답변은 새 답변을 받는 동안에도 아이콘 줄을 그대로 둔다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          isBusy: true,
          messages: [
            textMessage("user-1", "user", "첫 질문"),
            textMessage("assistant-1", "assistant", "첫 답변"),
            textMessage("user-2", "user", "두 번째 질문"),
            textMessage("assistant-2", "assistant", "받는 중"),
          ],
        })}
      />
    );

    expect(screen.getAllByLabelText(chatLabels.copyAnswer)).toHaveLength(1);
  });

  // The list keeps its rows until `data` or `extraData` changes; handing it a
  // new renderItem does not reach them. The last answer arrives while the
  // request is still open, so nothing about the messages changes when it
  // closes and only this tells the rows to pick up their icon row.
  test("답변이 끝나면 목록에 메시지를 다시 그리라고 알린다", async () => {
    const messages = [
      textMessage("user-1", "user", "질문"),
      textMessage("assistant-1", "assistant", "답변"),
    ];
    const { rerender } = await renderWithHeroUI(
      <ChatPanel chat={chatSession({ isBusy: true, messages })} />
    );
    const whileBusy = screen.getByTestId("chat-list").props.extraData;

    await rerender(
      <ChatPanel chat={chatSession({ isBusy: false, messages })} />
    );

    expect(screen.getByTestId("chat-list").props.extraData).not.toBe(whileBusy);
  });

  test("수정을 시작해도 목록에 메시지를 다시 그리라고 알린다", async () => {
    const messages = [
      textMessage("user-1", "user", "질문"),
      textMessage("assistant-1", "assistant", "답변"),
    ];
    const { rerender } = await renderWithHeroUI(
      <ChatPanel chat={chatSession({ messages })} />
    );
    const beforeEdit = screen.getByTestId("chat-list").props.extraData;

    await rerender(
      <ChatPanel chat={chatSession({ editingMessageId: "user-1", messages })} />
    );

    expect(screen.getByTestId("chat-list").props.extraData).not.toBe(
      beforeEdit
    );
  });

  test("답변 복사는 그 답변의 본문 전체를 클립보드에 넣는다", async () => {
    const user = userEvent.setup();
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("assistant-1", "assistant", "긴 답변 전체")],
        })}
      />
    );

    await user.press(screen.getByLabelText(chatLabels.copyAnswer));

    expect(mockSetStringAsync).toHaveBeenCalledWith("긴 답변 전체");
  });

  test("답변 다시 받기는 그 답변을 기준으로 되돌린다", async () => {
    const regenerateAnswer = jest.fn();
    const user = userEvent.setup();
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [
            textMessage("user-1", "user", "첫 질문"),
            textMessage("assistant-1", "assistant", "첫 답변"),
            textMessage("user-2", "user", "두 번째 질문"),
            textMessage("assistant-2", "assistant", "두 번째 답변"),
          ],
          regenerateAnswer,
        })}
      />
    );

    const [firstAnswerAction] = screen.getAllByLabelText(chatLabels.regenerate);
    await user.press(firstAnswerAction);

    expect(regenerateAnswer).toHaveBeenCalledWith("assistant-1");
  });

  test("메시지를 길게 누르면 메뉴가 열리고 한 번 누르는 것은 아무 일도 하지 않는다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("user-1", "user", "질문")],
        })}
      />
    );

    await act(() => {
      fireEvent.press(screen.getByTestId("chat-message-user"));
    });

    expect(screen.queryByTestId("chat-message-menu")).not.toBeOnTheScreen();

    await longPressMessage();

    expect(screen.getByTestId("chat-message-menu")).toBeOnTheScreen();
    expect(screen.getByText(chatLabels.copyMessage)).toBeOnTheScreen();
    expect(screen.getByText(chatLabels.editMessage)).toBeOnTheScreen();
  });

  test("답변을 받는 동안에는 메시지 메뉴를 열지 않는다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          isBusy: true,
          messages: [textMessage("user-1", "user", "질문")],
        })}
      />
    );

    await longPressMessage();

    expect(screen.queryByTestId("chat-message-menu")).not.toBeOnTheScreen();
  });

  test("메뉴의 복사는 그 메시지의 본문 전체를 클립보드에 넣는다", async () => {
    const user = userEvent.setup();
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("user-1", "user", "가져갈 질문 전체")],
        })}
      />
    );

    await longPressMessage();
    await user.press(screen.getByText(chatLabels.copyMessage));

    expect(mockSetStringAsync).toHaveBeenCalledWith("가져갈 질문 전체");
  });

  test("메뉴의 수정은 그 메시지의 수정을 시작한다", async () => {
    const beginEdit = jest.fn();
    const user = userEvent.setup();
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          beginEdit,
          messages: [textMessage("user-1", "user", "질문")],
        })}
      />
    );

    await longPressMessage();
    await user.press(screen.getByText(chatLabels.editMessage));

    expect(beginEdit).toHaveBeenCalledWith("user-1");
  });

  // The answer's own selection now belongs to the Markdown renderer, which
  // turns it back on once a message stops streaming. Only the question's side
  // is the panel's to state: selecting it would take the long press its menu
  // needs.
  test("메시지 본문은 선택할 수 없다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("user-1", "user", "질문")],
        })}
      />
    );

    expect(screen.getByTestId("chat-message-user").props.selectable).toBe(
      false
    );
  });

  test("사용자 메시지와 AI 답변은 같은 글자 크기와 행간을 쓴다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [
            textMessage("user-1", "user", "질문"),
            textMessage("assistant-1", "assistant", "답변"),
          ],
        })}
      />
    );

    // The question takes its size from a class and the answer from the numbers
    // the Markdown renderer accepts, so the check is that the two still meet at
    // the same body size rather than each keeping its renderer's default.
    const question = screen.getByTestId("chat-message-user");
    expect(question.props.className).toContain("text-base");
    expect(question.props.className).toContain("leading-6");
    expect(
      screen.getByTestId("chat-message-assistant").props.markdownStyle.paragraph
    ).toMatchObject({ fontSize: 16, lineHeight: 24 });
  });

  test("사용자가 이전 메시지로 스크롤하면 최신 메시지 이동 버튼을 보여준다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("assistant-1", "assistant", "답변")],
        })}
      />
    );
    await scrollAwayFromLatest();

    expect(screen.getByLabelText("최신 메시지로 이동")).toBeOnTheScreen();
  });

  test("목록 위쪽의 음수 오프셋은 이전 메시지 이동으로 보지 않는다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("assistant-1", "assistant", "답변")],
        })}
      />
    );
    const list = screen.getByTestId("chat-list");

    await act(() => {
      list.props.onScrollBeginDrag({
        nativeEvent: { contentOffset: { y: 0 } },
      });
      list.props.onScroll({
        nativeEvent: {
          contentInset: { bottom: 0 },
          contentOffset: { y: -120 },
          contentSize: { height: 800 },
          layoutMeasurement: { height: 400 },
        },
      });
    });

    expect(screen.queryByLabelText(chatLabels.latest)).not.toBeOnTheScreen();
  });

  test("최신 메시지 버튼은 입력창 밖의 투명한 오버레이에 띄운다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("assistant-1", "assistant", "답변")],
        })}
      />
    );
    await act(() => {
      screen.getByTestId("chat-composer").props.onLayout({
        nativeEvent: { layout: { height: 76 } },
      });
    });
    await scrollAwayFromLatest();

    expect(
      within(screen.getByTestId("chat-composer")).queryByLabelText(
        chatLabels.latest
      )
    ).not.toBeOnTheScreen();
    expect(
      StyleSheet.flatten(screen.getByTestId("chat-latest-overlay").props.style)
    ).toMatchObject({ bottom: 76, position: "absolute" });
    expect(screen.getByTestId("chat-latest-overlay").props.pointerEvents).toBe(
      "box-none"
    );
  });

  test("최신 메시지 이동 버튼을 누르면 자동 추적을 다시 켠다", async () => {
    const user = userEvent.setup();
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("assistant-1", "assistant", "답변")],
        })}
      />
    );
    await scrollAwayFromLatest();

    await user.press(screen.getByLabelText(chatLabels.latest));

    expect(screen.queryByLabelText(chatLabels.latest)).not.toBeOnTheScreen();
  });

  test("사용자가 직접 목록 끝까지 내려오면 자동 추적을 다시 켠다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("assistant-1", "assistant", "답변")],
        })}
      />
    );
    await scrollAwayFromLatest();
    const list = screen.getByTestId("chat-list");

    await act(() => {
      list.props.onEndVisible(true);
    });

    expect(screen.queryByLabelText(chatLabels.latest)).not.toBeOnTheScreen();
  });

  test("최신 메시지가 보이지 않는다는 신호만으로 자동 추적을 끄지 않는다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("assistant-1", "assistant", "답변")],
        })}
      />
    );
    const list = screen.getByTestId("chat-list");

    await act(() => {
      list.props.onEndVisible(false);
    });

    expect(screen.queryByLabelText(chatLabels.latest)).not.toBeOnTheScreen();
    expect(list.props.maintainScrollAtEnd).toEqual({
      animated: false,
      on: { dataChange: true, itemLayout: true },
    });
  });

  test("사용자가 시작한 관성 스크롤이 끝에 닿아도 자동 추적을 다시 켠다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("assistant-1", "assistant", "답변")],
        })}
      />
    );
    await scrollAwayFromLatest();
    const list = screen.getByTestId("chat-list");

    await act(() => {
      list.props.onScrollBeginDrag({
        nativeEvent: { contentOffset: { y: 160 } },
      });
      list.props.onScrollEndDrag({ nativeEvent: {} });
      list.props.onMomentumScrollBegin({ nativeEvent: {} });
      list.props.onEndVisible(true);
    });

    expect(screen.queryByLabelText(chatLabels.latest)).not.toBeOnTheScreen();
  });

  test("코드가 시작한 스크롤은 자동 추적 중단으로 보지 않는다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("assistant-1", "assistant", "답변")],
        })}
      />
    );
    const list = screen.getByTestId("chat-list");

    await act(() => {
      list.props.onMomentumScrollBegin({ nativeEvent: {} });
      list.props.onScroll({
        nativeEvent: {
          contentInset: { bottom: 0 },
          contentOffset: { y: 160 },
          contentSize: { height: 800 },
          layoutMeasurement: { height: 400 },
        },
      });
    });

    expect(screen.queryByLabelText(chatLabels.latest)).not.toBeOnTheScreen();
  });

  test("메시지 id를 가상 목록 키로 사용하고 항목을 재활용하지 않는다", async () => {
    const messages = [
      textMessage("user-stable-id", "user", "같은 내용"),
      textMessage("assistant-stable-id", "assistant", "같은 내용"),
    ];
    await renderWithHeroUI(<ChatPanel chat={chatSession({ messages })} />);
    const list = screen.getByTestId("chat-list");

    expect(list.props.keyExtractor(messages[0])).toBe("user-stable-id");
    expect(list.props.keyExtractor(messages[1])).toBe("assistant-stable-id");
    expect(list.props.recycleItems).toBe(false);
  });

  test("스트리밍 추적은 애니메이션 없이 크기와 새 메시지 변화를 따른다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} />);
    const list = screen.getByTestId("chat-list");

    expect(list.props.maintainScrollAtEnd).toEqual({
      animated: false,
      on: { dataChange: true, itemLayout: true },
    });
    expect(list.props.maintainVisibleContentPosition).toEqual({
      data: false,
      size: true,
    });
    expect(list.props.keyboardLiftBehavior).toBe("whenAtEnd");
    expect(list.props.initialScrollAtEnd).toBeUndefined();
  });

  test("첫 질문도 헤더 아래 12px 기준으로 끝 공간을 만든다", async () => {
    const user = userEvent.setup();
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({ draft: "첫 질문", send: jest.fn() })}
        topInset={116}
      />
    );

    await user.press(screen.getByLabelText(chatLabels.send));

    expect(
      screen.getByTestId("chat-list").props.anchoredEndSpace
    ).toMatchObject({
      anchorIndex: 0,
      anchorOffset: 128,
    });
    expect(
      screen.getByTestId("chat-list").props
        .applyWorkaroundForContentInsetHitTestBug
    ).toBe(true);
    expect(mockScrollToEnd).not.toHaveBeenCalled();
  });

  test("두 번째 질문은 투명한 헤더 아래 12px 위치에 고정한다", async () => {
    const user = userEvent.setup();
    const messages = [
      textMessage("user-1", "user", "이전 질문"),
      textMessage("assistant-1", "assistant", "이전 답변"),
    ];
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({ draft: "새 질문", messages, send: jest.fn() })}
        topInset={116}
      />
    );

    await user.press(screen.getByLabelText(chatLabels.send));

    expect(
      screen.getByTestId("chat-list").props.anchoredEndSpace
    ).toMatchObject({
      anchorIndex: 2,
      anchorOffset: 128,
    });
  });

  test("두 번째 질문은 고정 공간이 반영된 다음 프레임에 한 번 이동한다", async () => {
    const dismiss = jest.mocked(KeyboardController.dismiss);
    const user = userEvent.setup();
    const messages = [
      textMessage("user-1", "user", "이전 질문"),
      textMessage("assistant-1", "assistant", "이전 답변"),
    ];
    dismiss.mockClear();
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({ draft: "새 질문", messages, send: jest.fn() })}
      />
    );

    await user.press(screen.getByLabelText(chatLabels.send));

    const listBeforeReady = screen.getByTestId("chat-list");
    const anchoredEndSpace = listBeforeReady.props
      .anchoredEndSpace as MockAnchoredEndSpace;
    expect(listBeforeReady.props.maintainScrollAtEnd).toBe(false);
    expect(mockScrollToEnd).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    expect(anchoredEndSpace.onReady).toEqual(expect.any(Function));

    let runPositioningFrame: FrameRequestCallback | undefined;
    jest
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation((callback) => {
        runPositioningFrame = callback;
        return 1;
      });
    let positioning: Promise<void> | undefined;
    await act(async () => {
      positioning = anchoredEndSpace.onReady?.({
        anchorIndex: 2,
        anchorKey: "user-2",
        size: 500,
      }) as unknown as Promise<void>;
      await Promise.resolve();
    });
    expect(mockScrollToEnd).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();

    await act(async () => {
      runPositioningFrame?.(0);
      await positioning;
    });

    expect(mockScrollToEnd).toHaveBeenCalledTimes(1);
    expect(mockScrollToEnd).toHaveBeenCalledWith({ animated: true });
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("chat-list").props.maintainScrollAtEnd).toEqual({
      animated: false,
      on: { dataChange: true, itemLayout: true },
    });
  });

  test("질문을 보내면 키보드를 닫고 최신 답변 자동 추적을 다시 켠다", async () => {
    const dismiss = jest.mocked(KeyboardController.dismiss);
    const user = userEvent.setup();
    dismiss.mockClear();
    await renderWithHeroUI(<EditableChat onSend={jest.fn()} />);
    await scrollAwayFromLatest();
    await user.type(screen.getByLabelText(chatLabels.input), "질문");

    await user.press(screen.getByLabelText(chatLabels.send));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText(chatLabels.latest)).not.toBeOnTheScreen();
  });

  test("입력과 전송을 채팅 세션에 연결한다", async () => {
    const send = jest.fn();
    const user = userEvent.setup();

    await renderWithHeroUI(<EditableChat onSend={send} />);

    await user.type(screen.getByLabelText(chatLabels.input), "질문");
    expect(screen.getByLabelText(chatLabels.input)).toHaveDisplayValue("질문");

    await user.press(screen.getByLabelText(chatLabels.send));
    expect(send).toHaveBeenCalledTimes(1);
  });

  test("긴 입력을 보내면 입력창 높이를 한 줄로 줄인다", async () => {
    const user = userEvent.setup();
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          draft: "여러 줄로 늘어난 긴 질문",
          send: jest.fn(),
        })}
      />
    );
    const input = screen.getByLabelText(chatLabels.input);

    await act(() => {
      input.props.onContentSizeChange({
        nativeEvent: { contentSize: { height: 240, width: 300 } },
      });
    });

    expect(
      StyleSheet.flatten(screen.getByLabelText(chatLabels.input).props.style)
        .height
    ).toBe(120);

    await user.press(screen.getByLabelText(chatLabels.send));

    expect(
      StyleSheet.flatten(screen.getByLabelText(chatLabels.input).props.style)
        .height
    ).toBe(48);
  });

  test("답변을 받는 동안 전송 자리는 중지가 된다", async () => {
    const stop = jest.fn(() => Promise.resolve());
    const user = userEvent.setup();
    await renderWithHeroUI(
      <ChatPanel chat={chatSession({ draft: "질문", isBusy: true, stop })} />
    );

    expect(screen.queryByLabelText(chatLabels.send)).not.toBeOnTheScreen();

    await user.press(screen.getByLabelText(chatLabels.stop));

    expect(stop).toHaveBeenCalledTimes(1);
  });

  // The two share a place in the tree, so React keeps one instance and only
  // changes its props. On Android a `disabled` that stops being passed is
  // never cleared, and the stop button inherits the send button's disabled
  // state: it draws normally and refuses every touch.
  test("중지는 전송의 비활성 상태를 물려받지 않는다", async () => {
    const { rerender } = await renderWithHeroUI(
      <ChatPanel chat={chatSession({ draft: "", isBusy: false })} />
    );

    expect(screen.getByLabelText(chatLabels.send)).toBeDisabled();

    await rerender(<ChatPanel chat={chatSession({ isBusy: true })} />);

    const stop = screen.getByLabelText(chatLabels.stop);
    expect(stop).toBeEnabled();
    expect(stop.props.accessibilityState).toMatchObject({ disabled: false });
  });

  test("답변을 다 받으면 전송이 돌아온다", async () => {
    await renderWithHeroUI(
      <ChatPanel chat={chatSession({ draft: "질문", isBusy: false })} />
    );

    expect(screen.getByLabelText(chatLabels.send)).toBeOnTheScreen();
    expect(screen.queryByLabelText(chatLabels.stop)).not.toBeOnTheScreen();
  });

  test("요청이 실패하면 오류 문구 옆에 다시 시도를 둔다", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const retry = jest.fn();
    const user = userEvent.setup();

    await renderWithHeroUI(
      <ChatPanel chat={chatSession({ error: new Error("network"), retry })} />
    );

    expect(screen.getByText(chatLabels.errorAnnouncement)).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith(chatLabels.errorAnnouncement);

    await user.press(screen.getByLabelText(chatLabels.retry));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  test("실패하지 않았으면 다시 시도를 두지 않는다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} />);

    expect(screen.queryByLabelText(chatLabels.retry)).not.toBeOnTheScreen();
  });

  test("수정 중에는 안내와 그만두기를 보여 주고 사라질 범위를 흐리게 그린다", async () => {
    const cancelEdit = jest.fn();
    const user = userEvent.setup();
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          cancelEdit,
          draft: "두 번째 질문",
          editingMessageId: "user-2",
          messages: [
            textMessage("user-1", "user", "첫 질문"),
            textMessage("assistant-1", "assistant", "첫 답변"),
            textMessage("user-2", "user", "두 번째 질문"),
            textMessage("assistant-2", "assistant", "두 번째 답변"),
          ],
        })}
      />
    );

    expect(screen.getByText(chatLabels.editNotice)).toBeOnTheScreen();

    const rows = screen.getAllByTestId("chat-message-row");
    expect(
      rows.map((row) => StyleSheet.flatten(row.props.style).opacity)
    ).toEqual([1, 1, 0.38, 0.38]);

    await user.press(screen.getByLabelText(chatLabels.endEdit));

    expect(cancelEdit).toHaveBeenCalledTimes(1);
  });

  test("수정 중이 아니면 안내를 두지 않는다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} />);

    expect(screen.queryByTestId("chat-edit-notice")).not.toBeOnTheScreen();
  });

  test("수정 중에는 답변의 아이콘 줄을 누를 수 없다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          editingMessageId: "user-1",
          messages: [
            textMessage("user-1", "user", "질문"),
            textMessage("assistant-1", "assistant", "답변"),
          ],
        })}
      />
    );

    expect(screen.getByLabelText(chatLabels.copyAnswer)).toBeDisabled();
    expect(screen.getByLabelText(chatLabels.regenerate)).toBeDisabled();
  });

  test("입력창과 보내기를 하나의 떠 있는 컨트롤로 묶는다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} />);

    const surface = screen.getByTestId("chat-composer-surface");
    expect(within(surface).getByLabelText(chatLabels.input)).toBeOnTheScreen();
    expect(within(surface).getByLabelText(chatLabels.send)).toBeOnTheScreen();
    // Nothing paints across the screen behind it, and it takes no row of its
    // own: laid out as a sibling it would shorten the list and the conversation
    // would stop at a straight edge above the control instead of running on
    // under it.
    expect(screen.getByTestId("chat-composer").props.className).not.toContain(
      "bg-"
    );
    expect(
      StyleSheet.flatten(
        screen.getByTestId("chat-composer").parent?.props.style
      )
    ).toMatchObject({ bottom: 0, position: "absolute" });
  });

  test("오류와 수정 안내는 컨트롤 안이 아니라 그 위에 둔다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          editingMessageId: "user-1",
          error: new Error("network"),
          messages: [textMessage("user-1", "user", "질문")],
        })}
      />
    );

    const surface = screen.getByTestId("chat-composer-surface");
    expect(screen.getByTestId("chat-error")).toBeOnTheScreen();
    expect(screen.getByTestId("chat-edit-notice")).toBeOnTheScreen();
    expect(within(surface).queryByTestId("chat-error")).not.toBeOnTheScreen();
    expect(
      within(surface).queryByTestId("chat-edit-notice")
    ).not.toBeOnTheScreen();
  });

  test("이번에 보낸 질문만 아래에서 올라온다", async () => {
    const user = userEvent.setup();
    await renderWithHeroUI(
      <SendingChat
        messages={[
          textMessage("user-1", "user", "이전 질문"),
          textMessage("assistant-1", "assistant", "이전 답변"),
        ]}
      />
    );

    expect(enteringRows()).toEqual([false, false]);

    await user.press(screen.getByLabelText(chatLabels.send));

    expect(enteringRows()).toEqual([false, false, true]);
  });

  test("과거 대화를 처음 보여 줄 때는 아무 메시지도 움직이지 않는다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [
            textMessage("user-1", "user", "질문"),
            textMessage("assistant-1", "assistant", "답변"),
          ],
        })}
      />
    );

    expect(enteringRows()).toEqual([false, false]);
  });

  // An edited question is a new send, so it arrives the same way a fresh one
  // does even though the conversation got shorter first.
  test("수정해서 다시 보낸 질문도 아래에서 올라온다", async () => {
    const user = userEvent.setup();
    await renderWithHeroUI(
      <SendingChat
        editingMessageId="user-2"
        messages={[
          textMessage("user-1", "user", "첫 질문"),
          textMessage("assistant-1", "assistant", "첫 답변"),
          textMessage("user-2", "user", "두 번째 질문"),
          textMessage("assistant-2", "assistant", "두 번째 답변"),
        ]}
      />
    );

    await user.press(screen.getByLabelText(chatLabels.send));

    expect(enteringRows()).toEqual([false, false, true]);
  });

  test("답변을 다시 받는 것은 질문을 움직이지 않는다", async () => {
    const regenerateAnswer = jest.fn();
    const user = userEvent.setup();
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [
            textMessage("user-1", "user", "질문"),
            textMessage("assistant-1", "assistant", "답변"),
          ],
          regenerateAnswer,
        })}
      />
    );

    await user.press(screen.getByLabelText(chatLabels.regenerate));

    expect(enteringRows()).toEqual([false, false]);
  });

  test("답변이 늦으면 그 자리에 대기 표시를 두고 첫 글자가 오면 없앤다", async () => {
    jest.useFakeTimers();
    const { rerender } = await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          isBusy: true,
          messages: [textMessage("user-1", "user", "질문")],
        })}
      />
    );

    await act(() => {
      jest.advanceTimersByTime(300);
    });

    // The line paints its word twice, once as the mask and once as what the
    // band runs over, so the count is not what is being checked here.
    expect(screen.queryAllByText(chatLabels.waiting).length).toBeGreaterThan(0);

    await rerender(
      <ChatPanel
        chat={chatSession({
          isBusy: true,
          messages: [
            textMessage("user-1", "user", "질문"),
            textMessage("assistant-1", "assistant", "첫"),
          ],
        })}
      />
    );

    expect(screen.queryAllByText(chatLabels.waiting)).toHaveLength(0);
  });

  // Showing it for an answer that is already landing would put a line in the
  // answer's place and take it away before anyone could read it.
  test("첫 글자가 300ms 안에 오면 대기 표시를 한 번도 두지 않는다", async () => {
    jest.useFakeTimers();
    const { rerender } = await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          isBusy: true,
          messages: [textMessage("user-1", "user", "질문")],
        })}
      />
    );

    await act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(screen.queryAllByText(chatLabels.waiting)).toHaveLength(0);

    await rerender(
      <ChatPanel
        chat={chatSession({
          isBusy: true,
          messages: [
            textMessage("user-1", "user", "질문"),
            textMessage("assistant-1", "assistant", "첫"),
          ],
        })}
      />
    );
    await act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryAllByText(chatLabels.waiting)).toHaveLength(0);
  });

  test("답변을 받고 있지 않으면 대기 표시를 두지 않는다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [
            textMessage("user-1", "user", "질문"),
            textMessage("assistant-1", "assistant", "답변"),
          ],
        })}
      />
    );

    expect(screen.queryAllByText(chatLabels.waiting)).toHaveLength(0);
  });

  test("입력창의 return 키로 전송한다", async () => {
    const send = jest.fn();

    await renderWithHeroUI(
      <ChatPanel chat={chatSession({ draft: "질문", send })} />
    );

    fireEvent(screen.getByLabelText(chatLabels.input), "submitEditing");

    expect(send).toHaveBeenCalledTimes(1);
  });

  describe("Side chat", () => {
    const answered = [
      textMessage("user-1", "user", "질문"),
      textMessage("assistant-1", "assistant", "답변"),
    ];

    test("완료된 답변의 선택 메뉴에 Ask in side chat을 더한다", async () => {
      await renderWithHeroUI(
        <ChatPanel
          chat={chatSession({ messages: answered })}
          onAskInSideChat={jest.fn()}
        />
      );

      expect(
        selectionMenuItems(screen.getByTestId("chat-message-assistant"))
      ).toMatchObject([{ text: chatLabels.askInSideChat, visible: true }]);
    });

    test("메뉴 항목을 누르면 고른 구절과 그 답변을 알린다", async () => {
      const onAskInSideChat = jest.fn();
      await renderWithHeroUI(
        <ChatPanel
          chat={chatSession({ messages: answered })}
          onAskInSideChat={onAskInSideChat}
        />
      );

      const [item] = selectionMenuItems(
        screen.getByTestId("chat-message-assistant")
      );
      item.onPress({ selection: { end: 6, start: 0 }, text: "고른 구절" });

      expect(onAskInSideChat).toHaveBeenCalledWith({
        messageId: "assistant-1",
        phrase: "고른 구절",
      });
    });

    test("답변을 받는 동안과 수정 중에는 그 항목을 감춘다", async () => {
      const { rerender } = await renderWithHeroUI(
        <ChatPanel
          chat={chatSession({ isBusy: true, messages: answered })}
          onAskInSideChat={jest.fn()}
        />
      );

      expect(
        selectionMenuItems(screen.getByTestId("chat-message-assistant"))
      ).toMatchObject([{ visible: false }]);

      await rerender(
        <ChatPanel
          chat={chatSession({ editingMessageId: "user-1", messages: answered })}
          onAskInSideChat={jest.fn()}
        />
      );

      expect(
        selectionMenuItems(screen.getByTestId("chat-message-assistant"))
      ).toMatchObject([{ visible: false }]);
    });

    // The side chat sheet leaves this out, which is what keeps a side chat
    // from starting another one while its answers stay selectable.
    test("Side chat을 시작할 수 없는 화면에서는 항목을 두지 않는다", async () => {
      await renderWithHeroUI(
        <ChatPanel chat={chatSession({ messages: answered })} />
      );

      expect(
        screen.getByTestId("chat-message-assistant").props.contextMenuItems
      ).toBeUndefined();
    });

    test("고른 구절을 목록 맨 위에 읽기 전용 출처로 보여 준다", async () => {
      await renderWithHeroUI(
        <ChatPanel chat={chatSession()} source="이어받은 구절" />
      );

      const phrase = screen.getByTestId("side-chat-source-phrase");
      expect(phrase).toHaveTextContent("이어받은 구절");
      expect(phrase.props.selectable).toBe(false);
      expect(
        within(screen.getByTestId("chat-list")).getByTestId("side-chat-source")
      ).toBeOnTheScreen();
    });

    test("출처가 없으면 아무것도 얹지 않는다", async () => {
      await renderWithHeroUI(<ChatPanel chat={chatSession()} />);

      expect(screen.queryByTestId("side-chat-source")).not.toBeOnTheScreen();
    });

    test("Side chat이 없으면 수 표시를 두지 않는다", async () => {
      await renderWithHeroUI(
        <ChatPanel
          chat={chatSession()}
          onOpenSideChat={jest.fn()}
          sideChats={[]}
        />
      );

      expect(screen.queryByTestId("chat-side-count")).not.toBeOnTheScreen();
    });

    test("Side chat이 하나면 눌러서 바로 다시 연다", async () => {
      const onOpenSideChat = jest.fn();
      const user = userEvent.setup();
      await renderWithHeroUI(
        <ChatPanel
          chat={chatSession()}
          onOpenSideChat={onOpenSideChat}
          sideChats={[sideChatEntry("side-chat-1", "앞 구절", "마지막 말")]}
        />
      );

      expect(screen.getByText("Side chat 1개")).toBeOnTheScreen();

      await user.press(screen.getByLabelText("Side chat 1개 다시 열기"));

      expect(onOpenSideChat).toHaveBeenCalledWith("side-chat-1");
    });

    test("Side chat이 여럿이면 구절과 마지막 말로 갈린 목록에서 고른다", async () => {
      const onOpenSideChat = jest.fn();
      const user = userEvent.setup();
      await renderWithHeroUI(
        <ChatPanel
          chat={chatSession()}
          onOpenSideChat={onOpenSideChat}
          sideChats={[
            sideChatEntry("side-chat-2", "같은 구절", "두 번째 대화의 끝"),
            sideChatEntry("side-chat-1", "같은 구절", "첫 대화의 끝"),
          ]}
        />
      );

      expect(screen.getByText("Side chat 2개")).toBeOnTheScreen();

      await user.press(screen.getByLabelText("Side chat 2개 고르기"));

      expect(screen.getByText("두 번째 대화의 끝")).toBeOnTheScreen();
      expect(screen.getByText("첫 대화의 끝")).toBeOnTheScreen();
      expect(onOpenSideChat).not.toHaveBeenCalled();

      await user.press(screen.getAllByLabelText("같은 구절 Side chat 열기")[1]);

      expect(onOpenSideChat).toHaveBeenCalledWith("side-chat-1");
    });

    test("수 표시는 최신 메시지 버튼과 같은 오버레이에 쌓인다", async () => {
      await renderWithHeroUI(
        <ChatPanel
          chat={chatSession({
            messages: [textMessage("assistant-1", "assistant", "답변")],
          })}
          onOpenSideChat={jest.fn()}
          sideChats={[sideChatEntry("side-chat-1", "구절", "마지막 말")]}
        />
      );
      await scrollAwayFromLatest();

      const overlay = screen.getByTestId("chat-latest-overlay");
      expect(within(overlay).getByTestId("chat-side-count")).toBeOnTheScreen();
      expect(within(overlay).getByTestId("chat-latest")).toBeOnTheScreen();
      expect(StyleSheet.flatten(overlay.props.style).height).toBe(104);
    });

    test("수정 중에는 수 표시를 누를 수 없다", async () => {
      await renderWithHeroUI(
        <ChatPanel
          chat={chatSession({
            editingMessageId: "user-1",
            messages: [textMessage("user-1", "user", "질문")],
          })}
          onOpenSideChat={jest.fn()}
          sideChats={[sideChatEntry("side-chat-1", "구절", "마지막 말")]}
        />
      );

      expect(screen.getByTestId("chat-side-count")).toBeDisabled();
    });
  });
});
