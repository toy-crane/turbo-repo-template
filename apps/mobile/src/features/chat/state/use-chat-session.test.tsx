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

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
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
});
