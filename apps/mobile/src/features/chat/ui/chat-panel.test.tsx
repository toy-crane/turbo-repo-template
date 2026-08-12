import { afterEach, describe, expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  screen,
  userEvent,
} from "@testing-library/react-native";
import type { UIMessage } from "ai";
import { useState } from "react";
import { AccessibilityInfo } from "react-native";
import { KeyboardController } from "react-native-keyboard-controller";

import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ChatPanel, chatLabels } from "./chat-panel";

jest.mock("@legendapp/list/keyboard", () => {
  const React = require("react") as typeof import("react");
  const { KeyboardController: keyboardController } =
    require("react-native-keyboard-controller") as typeof import("react-native-keyboard-controller");
  const { View } = require("react-native") as typeof import("react-native");

  type MockListProps = React.ComponentProps<typeof View> & {
    anchoredEndSpace?: unknown;
    contentContainerStyle?: unknown;
    contentInsetEndAdjustment?: unknown;
    data: UIMessage[];
    freeze?: unknown;
    keyboardDismissMode?: unknown;
    keyboardLiftBehavior?: unknown;
    keyboardOffset?: unknown;
    keyboardShouldPersistTaps?: unknown;
    keyExtractor: (item: UIMessage) => string;
    maintainScrollAtEnd?: unknown;
    maintainScrollAtEndThreshold?: unknown;
    maintainVisibleContentPosition?: unknown;
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
      const { data, keyExtractor, renderItem, ...viewProps } = props;
      const scrollToEnd = React.useCallback(() => Promise.resolve(), []);

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
        data.map((item, index) =>
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
        )
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

function textMessage(
  id: string,
  role: "assistant" | "user",
  text: string
): UIMessage {
  return { id, parts: [{ text, type: "text" }], role };
}

function chatSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    draft: "",
    error: undefined,
    isBusy: false,
    messages: [],
    send: jest.fn(),
    setDraft: jest.fn(),
    ...overrides,
  };
}

function EditableChat({ onSend }: { onSend: () => void }) {
  const [draft, setDraft] = useState("");

  return <ChatPanel chat={chatSession({ draft, send: onSend, setDraft })} />;
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
    jest.restoreAllMocks();
  });

  test("대화가 비어 있으면 메시지 목록과 입력·전송만 보여준다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} />);

    expect(screen.getByTestId("chat-list")).toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.input)).toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.send)).toBeDisabled();
    expect(screen.queryByLabelText(chatLabels.latest)).not.toBeOnTheScreen();
    expect(screen.queryByText("무엇을 도와드릴까요?")).not.toBeOnTheScreen();
  });

  test("사용자 메시지와 AI 답변을 일반 텍스트로 보여준다", async () => {
    const messages = [
      textMessage("user-1", "user", "질문"),
      textMessage("assistant-1", "assistant", "# 제목 **강조**"),
    ];

    await renderWithHeroUI(<ChatPanel chat={chatSession({ messages })} />);

    expect(screen.getByText("질문")).toBeOnTheScreen();
    expect(screen.getByText("# 제목 **강조**")).toBeOnTheScreen();
    expect(screen.queryByTestId("chat-markdown")).not.toBeOnTheScreen();
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

  test("메시지 작업을 접근성 트리에 만들지 않는다", async () => {
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({
          messages: [textMessage("assistant-1", "assistant", "답변")],
        })}
      />
    );

    for (const removedLabel of [
      "메시지 복사",
      "편집 후 다시 보내기",
      "다시 생성",
    ]) {
      expect(screen.queryByLabelText(removedLabel)).not.toBeOnTheScreen();
    }
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
      list.props.onScrollBeginDrag({
        nativeEvent: { contentOffset: { y: 160 } },
      });
      list.props.onScroll({
        nativeEvent: {
          contentInset: { bottom: 0 },
          contentOffset: { y: 400 },
          contentSize: { height: 800 },
          layoutMeasurement: { height: 400 },
        },
      });
    });

    expect(screen.queryByLabelText(chatLabels.latest)).not.toBeOnTheScreen();
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
      list.props.onScroll({
        nativeEvent: {
          contentInset: { bottom: 0 },
          contentOffset: { y: 400 },
          contentSize: { height: 800 },
          layoutMeasurement: { height: 400 },
        },
      });
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

  test("보낸 질문의 메시지 위치만 다음 답변의 위쪽 기준으로 고정한다", async () => {
    const user = userEvent.setup();
    const messages = [
      textMessage("user-1", "user", "이전 질문"),
      textMessage("assistant-1", "assistant", "이전 답변"),
    ];
    await renderWithHeroUI(
      <ChatPanel
        chat={chatSession({ draft: "새 질문", messages, send: jest.fn() })}
      />
    );

    await user.press(screen.getByLabelText(chatLabels.send));

    expect(screen.getByTestId("chat-list").props.anchoredEndSpace).toEqual({
      anchorIndex: 2,
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

  test("생성 중에는 전송만 비활성화하고 별도 상태 작업을 만들지 않는다", async () => {
    await renderWithHeroUI(
      <ChatPanel chat={chatSession({ draft: "질문", isBusy: true })} />
    );

    expect(screen.getByLabelText(chatLabels.send)).toBeDisabled();
    expect(screen.queryByLabelText("생성 중지")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("chat-generating")).not.toBeOnTheScreen();
  });

  test("요청 실패는 짧은 오류만 보여주고 다시 시도 작업을 만들지 않는다", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");

    await renderWithHeroUI(
      <ChatPanel chat={chatSession({ error: new Error("network") })} />
    );

    expect(screen.getByText(chatLabels.errorAnnouncement)).toBeOnTheScreen();
    expect(screen.queryByLabelText("다시 보내기")).not.toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith(chatLabels.errorAnnouncement);
  });

  test("입력창의 return 키로 전송한다", async () => {
    const send = jest.fn();

    await renderWithHeroUI(
      <ChatPanel chat={chatSession({ draft: "질문", send })} />
    );

    fireEvent(screen.getByLabelText(chatLabels.input), "submitEditing");

    expect(send).toHaveBeenCalledTimes(1);
  });
});
