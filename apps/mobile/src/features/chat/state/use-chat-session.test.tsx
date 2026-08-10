import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { UIMessage, UIMessageChunk } from "ai";
import { simulateReadableStream } from "ai";

import { createChatTransport } from "@/features/chat/api/chat-transport";
import { useChatSession } from "./use-chat-session";

jest.mock("@/features/chat/api/chat-transport", () => ({
  createChatTransport: jest.fn(),
}));

const mockCreateChatTransport = jest.mocked(createChatTransport);

const ACCESS_TOKEN = "test-access-token";

function answerStream(text: string): ReadableStream<UIMessageChunk> {
  return simulateReadableStream({
    chunkDelayInMs: null,
    chunks: [
      { type: "start" },
      { id: "0", type: "text-start" },
      { delta: text, id: "0", type: "text-delta" },
      { id: "0", type: "text-end" },
      { type: "finish" },
    ] as UIMessageChunk[],
    initialDelayInMs: null,
  });
}

function neverEndingStream(): ReadableStream<UIMessageChunk> {
  return simulateReadableStream({
    chunkDelayInMs: null,
    chunks: [{ type: "start" }] as UIMessageChunk[],
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

/** The message list the transport was given on its nth call. */
function sentMessages(
  transport: ReturnType<typeof fakeTransport>,
  call: number
): UIMessage[] {
  const options = transport.sendMessages.mock.calls[call]?.[0];

  if (!options) {
    throw new Error(`sendMessages was not called ${call + 1} times`);
  }

  return options.messages;
}

function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

describe("useChatSession 편집 후 다시 보내기", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("편집 전송은 편집된 사용자 메시지로 끝나고 이전 AI 답변을 포함하지 않는다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream("첫 답변"))
    );
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await act(() => {
      result.current.setDraft("첫 질문");
    });
    await act(() => {
      result.current.send();
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.status).toBe("ready");
    });

    // 편집을 시작하면 입력창에 원문이 채워진다.
    await act(() => {
      result.current.startEdit();
    });

    expect(result.current.editing).toBe(true);
    expect(result.current.draft).toBe("첫 질문");

    await act(() => {
      result.current.setDraft("고친 질문");
    });
    await act(() => {
      result.current.send();
    });

    await waitFor(() => {
      expect(transport.sendMessages).toHaveBeenCalledTimes(2);
    });

    const resent = sentMessages(transport, 1);
    const last = resent.at(-1);

    // 목록은 편집된 사용자 메시지로 끝나고,
    expect(last?.role).toBe("user");
    expect(textOf(last as UIMessage)).toBe("고친 질문");
    // 이전 AI 답변은 어디에도 없다. 갈래를 남기지 않는다.
    expect(resent.some((message) => message.role === "assistant")).toBe(false);
    expect(resent).toHaveLength(1);

    await waitFor(() => {
      expect(result.current.editing).toBe(false);
    });
  });

  test("편집을 취소하면 편집 전 초안이 복원된다", async () => {
    fakeTransport(() => Promise.resolve(answerStream("첫 답변")));

    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await act(() => {
      result.current.setDraft("첫 질문");
    });
    await act(() => {
      result.current.send();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    // 쓰다 만 초안이 있는 상태에서 편집을 시작한다.
    await act(() => {
      result.current.setDraft("쓰다 만 초안");
    });
    await act(() => {
      result.current.startEdit();
    });

    expect(result.current.draft).toBe("첫 질문");

    await act(() => {
      result.current.cancelEdit();
    });

    expect(result.current.editing).toBe(false);
    expect(result.current.draft).toBe("쓰다 만 초안");
  });

  test("다시 생성은 ready에서만 정확히 한 번 재요청한다", async () => {
    const transport = fakeTransport(() =>
      Promise.resolve(answerStream("답변"))
    );
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await act(() => {
      result.current.setDraft("질문");
    });
    await act(() => {
      result.current.send();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    await act(() => {
      result.current.regenerateLast();
    });

    await waitFor(() => {
      expect(transport.sendMessages).toHaveBeenCalledTimes(2);
    });

    // 재요청 목록은 사용자 메시지로 끝난다. 이전 답변은 교체 대상이다.
    const resent = sentMessages(transport, 1);

    expect(resent.at(-1)?.role).toBe("user");
  });

  test("답변 뒤에 보낸 질문을 중지해도 다시 생성은 그 답변만 새로 만든다", async () => {
    let attempt = 0;
    const transport = fakeTransport(() => {
      attempt += 1;

      // 두 번째 요청은 첫 조각도 오기 전에 중지되는 상황을 만든다.
      return Promise.resolve(
        attempt === 2 ? neverEndingStream() : answerStream(`답변 ${attempt}`)
      );
    });
    const { result } = await renderHook(() => useChatSession(ACCESS_TOKEN));

    await act(() => {
      result.current.setDraft("첫 질문");
    });
    await act(() => {
      result.current.send();
    });
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    await act(() => {
      result.current.setDraft("둘째 질문");
    });
    await act(() => {
      result.current.send();
    });
    await waitFor(() => {
      expect(transport.sendMessages).toHaveBeenCalledTimes(2);
    });
    await act(() => {
      result.current.stop();
    });
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    // 목록의 마지막은 이제 사용자 메시지다. 다시 생성 버튼은 그 앞의 답변에 붙어 있다.
    expect(result.current.messages.at(-1)?.role).toBe("user");

    await act(() => {
      result.current.regenerateLast();
    });
    await waitFor(() => {
      expect(transport.sendMessages).toHaveBeenCalledTimes(3);
    });

    // 다시 만드는 대상은 "답변 1"이므로 재요청은 "첫 질문"에서 끊긴다.
    // messageId를 넘기지 않으면 마지막 항목인 "둘째 질문"을 답하게 된다.
    const resent = sentMessages(transport, 2);

    expect(resent.map(textOf)).toEqual(["첫 질문"]);
  });
});
