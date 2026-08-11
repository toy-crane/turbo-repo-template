import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { fireEvent, screen, userEvent } from "@testing-library/react-native";
import type { UIMessage } from "ai";
import { useState } from "react";
import { AccessibilityInfo } from "react-native";

import type { ChatSession } from "@/features/chat/state/use-chat-session";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ChatPanel, chatLabels } from "./chat-panel";

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

describe("ChatPanel", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("대화가 비어 있으면 메시지 목록과 입력·전송만 보여준다", async () => {
    await renderWithHeroUI(<ChatPanel chat={chatSession()} />);

    expect(screen.getByTestId("chat-list")).toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.input)).toBeOnTheScreen();
    expect(screen.getByLabelText(chatLabels.send)).toBeDisabled();
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
      "최신 메시지로 이동",
    ]) {
      expect(screen.queryByLabelText(removedLabel)).not.toBeOnTheScreen();
    }
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
