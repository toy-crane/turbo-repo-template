import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { UIMessage, UIMessageChunk } from "ai";
import { simulateReadableStream } from "ai";

import { createChatTransport } from "@/features/chat/api/chat-transport";
import { type ChatSession, useChatSession } from "./use-chat-session";

jest.mock("@/features/chat/api/chat-transport", () => ({
  createChatTransport: jest.fn(),
}));

const mockCreateChatTransport = jest.mocked(createChatTransport);
const ACCESS_TOKEN = "test-access-token";

function answerStream(...deltas: string[]): ReadableStream<UIMessageChunk> {
  return simulateReadableStream({
    chunkDelayInMs: null,
    chunks: [
      { type: "start" },
      { id: "0", type: "text-start" },
      ...deltas.map((delta) => ({
        delta,
        id: "0",
        type: "text-delta" as const,
      })),
      { id: "0", type: "text-end" },
      { type: "finish" },
    ],
    initialDelayInMs: null,
  });
}

function fakeTransport(respond: () => Promise<ReadableStream<UIMessageChunk>>) {
  const transport = {
    reconnectToStream: () => Promise.resolve(null),
    sendMessages: jest.fn((_options: { messages: UIMessage[] }) => respond()),
  };

  mockCreateChatTransport.mockReturnValue(
    transport as unknown as ReturnType<typeof createChatTransport>
  );

  return transport;
}

/**
 * A stream the test writes to by hand. Anything that has to be observed while
 * the answer is still arriving — stopping it, the icon row staying away —
 * needs the request to stay open until the test says otherwise.
 */
function openAnswerStream() {
  let controller: ReadableStreamDefaultController<UIMessageChunk> | undefined;
  const stream = new ReadableStream<UIMessageChunk>({
    start(streamController) {
      controller = streamController;
      streamController.enqueue({ type: "start" });
      streamController.enqueue({ id: "0", type: "text-start" });
    },
  });

  return {
    stream,
    write: (delta: string) =>
      controller?.enqueue({ delta, id: "0", type: "text-delta" }),
  };
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/** The ids the AI SDK gave the messages, so a test can name one of them. */
function messageIds(messages: UIMessage[]): string[] {
  return messages.map((message) => message.id);
}

async function ask(result: { current: ChatSession }, text: string) {
  await act(() => {
    result.current.setDraft(text);
  });
  await act(() => {
    result.current.send();
  });
}

describe("useChatSession", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("일반 텍스트를 보내고 스트리밍 답변을 메시지에 이어 붙인다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream("안녕", "하세요"))
    );
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await act(() => {
      result.current.setDraft("  질문  ");
    });
    await act(() => {
      result.current.send();
    });

    expect(result.current.draft).toBe("");

    await waitFor(() => {
      expect(result.current.messages.map(messageText)).toEqual([
        "질문",
        "안녕하세요",
      ]);
    });
    expect(transport.sendMessages).toHaveBeenCalledTimes(1);
  });

  test("공백뿐인 입력은 보내지 않는다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream("답변"))
    );
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await act(() => {
      result.current.setDraft("   ");
    });
    await act(() => {
      result.current.send();
    });

    expect(transport.sendMessages).not.toHaveBeenCalled();
  });

  test("access token이 없으면 보내지 않는다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream("답변"))
    );
    const { result } = await renderHook(() => useChatSession(undefined));

    await act(() => {
      result.current.setDraft("질문");
    });
    await act(() => {
      result.current.send();
    });

    expect(transport.sendMessages).not.toHaveBeenCalled();
  });

  test("같은 프레임의 연속 전송은 한 번만 보낸다", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const transport = fakeTransport(async () => {
      await gate;

      return answerStream("답변");
    });
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await act(() => {
      result.current.setDraft("질문");
    });
    await act(() => {
      result.current.send();
      result.current.send();
    });

    expect(transport.sendMessages).toHaveBeenCalledTimes(1);

    release?.();
    await waitFor(() => {
      expect(result.current.messages.map(messageText)).toContain("답변");
    });
  });

  test("요청이 실패하면 오류를 공개한다", async () => {
    fakeTransport(() => Promise.reject(new Error("network is down")));
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await act(() => {
      result.current.setDraft("질문");
    });
    await act(() => {
      result.current.send();
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  test("답변 다시 받기는 그 답변과 뒤의 메시지를 버리고 다시 묻는다", async () => {
    const answers = ["첫 답변", "두 번째 답변", "새 답변"];
    let turn = 0;
    const transport = fakeTransport(() => {
      const answer = answers[turn];
      turn += 1;

      return Promise.resolve(answerStream(answer));
    });
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await ask(result, "첫 질문");
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });
    await ask(result, "두 번째 질문");
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(4);
    });

    const [, firstAnswerId] = messageIds(result.current.messages);

    await act(() => {
      result.current.regenerateAnswer(firstAnswerId);
    });

    await waitFor(() => {
      expect(result.current.messages.map(messageText)).toEqual([
        "첫 질문",
        "새 답변",
      ]);
    });
    // The request carries the question alone, so the model is asked again
    // rather than asked to continue from the answer it already gave.
    expect(
      transport.sendMessages.mock.calls[2][0].messages.map(messageText)
    ).toEqual(["첫 질문"]);
  });

  test("다시 시도는 실패한 메시지를 그대로 두고 같은 질문을 다시 보낸다", async () => {
    let attempts = 0;
    const transport = fakeTransport(() => {
      attempts += 1;

      if (attempts === 1) {
        return Promise.reject(new Error("network is down"));
      }

      return Promise.resolve(answerStream("답변"));
    });
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await ask(result, "질문");
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
    expect(result.current.messages.map(messageText)).toEqual(["질문"]);

    await act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.messages.map(messageText)).toEqual([
        "질문",
        "답변",
      ]);
    });
    expect(result.current.error).toBeUndefined();
    expect(
      transport.sendMessages.mock.calls[1][0].messages.map(messageText)
    ).toEqual(["질문"]);
  });

  test("답변이 없어도 다시 시도가 터지지 않는다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream("답변"))
    );
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await act(() => {
      result.current.retry();
    });

    expect(transport.sendMessages).not.toHaveBeenCalled();
    expect(result.current.error).toBeUndefined();
  });

  test("그만 받으면 그때까지 받은 답변을 대화에 남긴다", async () => {
    const answer = openAnswerStream();
    fakeTransport(() => Promise.resolve(answer.stream));
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await ask(result, "질문");
    await act(() => {
      answer.write("여기까지");
    });
    await waitFor(() => {
      expect(result.current.messages.map(messageText)).toEqual([
        "질문",
        "여기까지",
      ]);
    });

    await act(async () => {
      await result.current.stop();
    });

    await waitFor(() => {
      expect(result.current.isBusy).toBe(false);
    });
    expect(result.current.messages.map(messageText)).toEqual([
      "질문",
      "여기까지",
    ]);
  });

  test("그만 받은 뒤에 새 메시지를 보낼 수 있다", async () => {
    const answer = openAnswerStream();
    let isFirstTurn = true;
    const transport = fakeTransport(() => {
      if (isFirstTurn) {
        isFirstTurn = false;

        return Promise.resolve(answer.stream);
      }

      return Promise.resolve(answerStream("다음 답변"));
    });
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await ask(result, "첫 질문");
    await act(() => {
      answer.write("받다 만");
    });
    await act(async () => {
      await result.current.stop();
    });
    await waitFor(() => {
      expect(result.current.isBusy).toBe(false);
    });

    await ask(result, "다음 질문");

    await waitFor(() => {
      expect(result.current.messages.map(messageText)).toEqual([
        "첫 질문",
        "받다 만",
        "다음 질문",
        "다음 답변",
      ]);
    });
    expect(transport.sendMessages).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeUndefined();
  });

  test("수정을 시작하면 원문이 입력창에 들어가고 쓰던 초안은 보관한다", async () => {
    fakeTransport(() => Promise.resolve(answerStream("답변")));
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await ask(result, "원래 질문");
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    const [questionId] = messageIds(result.current.messages);

    await act(() => {
      result.current.setDraft("쓰다 만 초안");
    });
    await act(() => {
      result.current.beginEdit(questionId);
    });

    expect(result.current.draft).toBe("원래 질문");
    expect(result.current.editingMessageId).toBe(questionId);

    await act(() => {
      result.current.cancelEdit();
    });

    expect(result.current.draft).toBe("쓰다 만 초안");
    expect(result.current.editingMessageId).toBeUndefined();
  });

  test("수정을 시작하면 남아 있던 오류를 지운다", async () => {
    fakeTransport(() => Promise.reject(new Error("network is down")));
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await ask(result, "질문");
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    const [questionId] = messageIds(result.current.messages);

    await act(() => {
      result.current.beginEdit(questionId);
    });

    // Leaving it up would put "try again" beside the edit notice, and the two
    // restart the conversation from different places.
    expect(result.current.error).toBeUndefined();
  });

  test("수정 상태에서 보내면 그 메시지부터 대화를 다시 시작한다", async () => {
    const answers = ["첫 답변", "두 번째 답변", "고친 답변"];
    let turn = 0;
    const transport = fakeTransport(() => {
      const answer = answers[turn];
      turn += 1;

      return Promise.resolve(answerStream(answer));
    });
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await ask(result, "첫 질문");
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });
    await ask(result, "두 번째 질문");
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(4);
    });

    const [, , secondQuestionId] = messageIds(result.current.messages);

    await act(() => {
      result.current.beginEdit(secondQuestionId);
    });
    await act(() => {
      result.current.setDraft("고친 질문");
    });
    await act(() => {
      result.current.send();
    });

    await waitFor(() => {
      expect(result.current.messages.map(messageText)).toEqual([
        "첫 질문",
        "첫 답변",
        "고친 질문",
        "고친 답변",
      ]);
    });
    expect(result.current.editingMessageId).toBeUndefined();
    expect(result.current.draft).toBe("");
    expect(
      transport.sendMessages.mock.calls[2][0].messages.map(messageText)
    ).toEqual(["첫 질문", "첫 답변", "고친 질문"]);
  });
});
