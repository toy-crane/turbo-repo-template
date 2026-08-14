import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { act, render, waitFor } from "@testing-library/react-native";
import type { UIMessage, UIMessageChunk } from "ai";

import { createSideChatTransport } from "@/features/chat/api/chat-transport";
import { type SideChat, SideChatsProvider, useSideChats } from "./side-chats";
import type { ChatSession } from "./use-chat-session";
import { useSideChatSession } from "./use-side-chat-session";

jest.mock("@/features/chat/api/chat-transport", () => ({
  createChatTransport: jest.fn(),
  createSideChatTransport: jest.fn(),
}));

const mockCreateSideChatTransport = jest.mocked(createSideChatTransport);
const ACCESS_TOKEN = "test-access-token";

interface FakeTransport {
  sendMessages: jest.Mock<
    (options: {
      messages: UIMessage[];
    }) => Promise<ReadableStream<UIMessageChunk>>
  >;
  /** The snapshot the store handed this side chat's transport. */
  snapshot: UIMessage[];
}

/**
 * A stream the test writes to by hand, so an answer can be left arriving while
 * the sheet showing it goes away.
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
    finish: () => {
      controller?.enqueue({ id: "0", type: "text-end" });
      controller?.enqueue({ type: "finish" });
      controller?.close();
    },
    stream,
    write: (delta: string) =>
      controller?.enqueue({ delta, id: "0", type: "text-delta" }),
  };
}

/** Every transport the store has built, in the order the side chats opened. */
let transports: FakeTransport[] = [];
/** The answers waiting for the next requests, in order. */
let answers: (() => Promise<ReadableStream<UIMessageChunk>>)[] = [];

function textMessage(
  id: string,
  role: "assistant" | "user",
  text: string
): UIMessage {
  return { id, parts: [{ text, type: "text" }], role };
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

const PARENT_MESSAGES = [
  textMessage("user-1", "user", "첫 질문"),
  textMessage("assistant-1", "assistant", "첫 답변"),
  textMessage("user-2", "user", "두 번째 질문"),
  textMessage("assistant-2", "assistant", "두 번째 답변"),
];
/** The parent conversation after its second answer was taken away. */
const WITHOUT_SECOND_ANSWER = PARENT_MESSAGES.slice(0, 3);

let mounted: ReturnType<typeof useSideChats> | undefined;
const sessions = new Map<string, ChatSession>();

function StoreProbe() {
  mounted = useSideChats();

  return null;
}

function SheetProbe({ opened }: { opened: SideChat }) {
  sessions.set(opened.id, useSideChatSession(opened, ACCESS_TOKEN));

  return null;
}

function Harness({ open = [] }: { open?: SideChat[] }) {
  return (
    <SideChatsProvider accessToken={ACCESS_TOKEN}>
      <StoreProbe />
      {open.map((opened) => (
        <SheetProbe key={opened.id} opened={opened} />
      ))}
    </SideChatsProvider>
  );
}

function store(): ReturnType<typeof useSideChats> {
  if (!mounted) {
    throw new Error("The side chat store is not mounted.");
  }

  return mounted;
}

/** Opens a side chat on an answer of the parent conversation. */
function start(sourceMessageId: string, phrase: string) {
  const sourceIndex = PARENT_MESSAGES.findIndex(
    (message) => message.id === sourceMessageId
  );

  return store().startSideChat({
    phrase,
    snapshot: PARENT_MESSAGES.slice(0, sourceIndex + 1),
    sourceMessageId,
  });
}

function chatWithId(id: string): SideChat {
  const found = store().chats.find((sideChat) => sideChat.id === id);

  if (!found) {
    throw new Error(`No side chat named ${id}.`);
  }

  return found;
}

function sessionOf(id: string): ChatSession {
  const found = sessions.get(id);

  if (!found) {
    throw new Error(`No side chat session named ${id}.`);
  }

  return found;
}

async function ask(id: string, text: string) {
  await act(() => {
    sessionOf(id).setDraft(text);
  });
  await act(() => {
    sessionOf(id).send();
  });
}

beforeEach(() => {
  transports = [];
  answers = [];
  sessions.clear();
  mounted = undefined;
  mockCreateSideChatTransport.mockImplementation(
    (_getAccessToken, snapshot) => {
      const transport: FakeTransport = {
        sendMessages: jest.fn(() => {
          const answer = answers.shift();

          return answer ? answer() : Promise.resolve(openAnswerStream().stream);
        }),
        snapshot,
      };
      transports.push(transport);

      return transport as unknown as ReturnType<typeof createSideChatTransport>;
    }
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("side chats", () => {
  test("선택한 구절과 그 답변까지의 부모 대화를 이어받는다", async () => {
    await render(<Harness />);

    await act(() => {
      start("assistant-1", "첫 답변의 한 구절");
    });

    expect(chatWithId("side-chat-1")).toMatchObject({
      phrase: "첫 답변의 한 구절",
      sourceMessageId: "assistant-1",
    });
    expect(chatWithId("side-chat-1").snapshot.map(messageText)).toEqual([
      "첫 질문",
      "첫 답변",
    ]);
    expect(transports[0].snapshot.map(messageText)).toEqual([
      "첫 질문",
      "첫 답변",
    ]);
  });

  test("Side chat 목록에는 부모 대화가 아니라 새로 주고받은 말만 담는다", async () => {
    const { rerender } = await render(<Harness />);
    await act(() => {
      start("assistant-1", "구절");
    });
    await rerender(<Harness open={[chatWithId("side-chat-1")]} />);

    await ask("side-chat-1", "이 구절이 무슨 뜻인가요");

    expect(sessionOf("side-chat-1").messages.map(messageText)).toEqual([
      "이 구절이 무슨 뜻인가요",
    ]);
  });

  // The whole reason the chat lives outside React: the sheet is a screen, and
  // a screen that goes away must not take the answer with it.
  test("시트를 닫아도 받고 있던 답변이 계속 도착한다", async () => {
    const answer = openAnswerStream();
    answers.push(() => Promise.resolve(answer.stream));
    const { rerender } = await render(<Harness />);
    await act(() => {
      start("assistant-1", "구절");
    });
    const opened = chatWithId("side-chat-1");
    await rerender(<Harness open={[opened]} />);

    await ask("side-chat-1", "질문");
    await act(() => {
      answer.write("여기까지");
    });

    await rerender(<Harness />);

    await act(() => {
      answer.write(" 그리고 더");
      answer.finish();
    });

    await waitFor(() => {
      expect(opened.chat.messages.map(messageText)).toEqual([
        "질문",
        "여기까지 그리고 더",
      ]);
    });
  });

  test("첫 질문을 보내기 전에는 수 표시에 넣지 않는다", async () => {
    await render(<Harness />);

    await act(() => {
      start("assistant-1", "구절");
    });

    expect(store().chats).toHaveLength(1);
    expect(store().askedChats).toHaveLength(0);
  });

  test("첫 질문을 보내면 수 표시에 넣고 그 뒤에는 닫아도 남는다", async () => {
    const { rerender } = await render(<Harness />);
    await act(() => {
      start("assistant-1", "구절");
    });
    await rerender(<Harness open={[chatWithId("side-chat-1")]} />);

    await ask("side-chat-1", "질문");

    await waitFor(() => {
      expect(store().askedChats).toHaveLength(1);
    });

    await rerender(<Harness />);

    expect(store().askedChats).toHaveLength(1);
  });

  test("첫 질문 전에 닫으면 임시 상태와 초안을 버린다", async () => {
    const { rerender } = await render(<Harness />);
    await act(() => {
      start("assistant-1", "구절");
    });
    await rerender(<Harness open={[chatWithId("side-chat-1")]} />);
    await act(() => {
      sessionOf("side-chat-1").setDraft("보내지 않은 초안");
    });

    await rerender(<Harness />);
    await act(() => {
      store().discardUnasked("side-chat-1");
    });

    expect(store().chats).toHaveLength(0);
    expect(store().askedChats).toHaveLength(0);
  });

  test("질문을 보낸 뒤에는 닫아도 버리지 않는다", async () => {
    const { rerender } = await render(<Harness />);
    await act(() => {
      start("assistant-1", "구절");
    });
    await rerender(<Harness open={[chatWithId("side-chat-1")]} />);
    await ask("side-chat-1", "질문");
    await waitFor(() => {
      expect(store().askedChats).toHaveLength(1);
    });

    await rerender(<Harness />);
    await act(() => {
      store().discardUnasked("side-chat-1");
    });

    expect(store().askedChats).toHaveLength(1);
  });

  test("서로 다른 답변에서 만든 Side chat을 한 수 표시에 함께 센다", async () => {
    const { rerender } = await render(<Harness />);
    await act(() => {
      start("assistant-1", "첫 답변의 구절");
      start("assistant-2", "두 번째 답변의 구절");
    });
    await rerender(
      <Harness open={[chatWithId("side-chat-1"), chatWithId("side-chat-2")]} />
    );

    await ask("side-chat-1", "첫 질문");
    await ask("side-chat-2", "두 번째 질문");

    await waitFor(() => {
      expect(store().askedChats).toHaveLength(2);
    });
    // Newest first, so the list reads the way it was built.
    expect(store().askedChats.map((sideChat) => sideChat.phrase)).toEqual([
      "두 번째 답변의 구절",
      "첫 답변의 구절",
    ]);
  });

  test("같은 답변에서 다시 시작해도 기존 Side chat에 합치지 않는다", async () => {
    await render(<Harness />);

    await act(() => {
      start("assistant-1", "앞 구절");
      start("assistant-1", "뒤 구절");
    });

    expect(store().chats.map((sideChat) => sideChat.id)).toEqual([
      "side-chat-2",
      "side-chat-1",
    ]);
    expect(chatWithId("side-chat-1").chat).not.toBe(
      chatWithId("side-chat-2").chat
    );
  });

  test("한 Side chat의 메시지와 초안은 다른 Side chat에 닿지 않는다", async () => {
    const { rerender } = await render(<Harness />);
    await act(() => {
      start("assistant-1", "앞 구절");
      start("assistant-1", "뒤 구절");
    });
    await rerender(
      <Harness open={[chatWithId("side-chat-1"), chatWithId("side-chat-2")]} />
    );

    await ask("side-chat-1", "첫 쪽 질문");
    await act(() => {
      sessionOf("side-chat-2").setDraft("두 번째 쪽 초안");
    });

    expect(sessionOf("side-chat-1").messages.map(messageText)).toEqual([
      "첫 쪽 질문",
    ]);
    expect(sessionOf("side-chat-1").draft).toBe("");
    expect(sessionOf("side-chat-2").messages).toEqual([]);
    expect(sessionOf("side-chat-2").draft).toBe("두 번째 쪽 초안");
  });

  test("시트를 닫아도 초안과 수정 상태를 그대로 둔다", async () => {
    const { rerender } = await render(<Harness />);
    await act(() => {
      start("assistant-1", "구절");
    });
    await rerender(<Harness open={[chatWithId("side-chat-1")]} />);
    await ask("side-chat-1", "보낸 질문");
    await waitFor(() => {
      expect(sessionOf("side-chat-1").messages).toHaveLength(1);
    });
    const [askedId] = sessionOf("side-chat-1").messages.map(
      (message) => message.id
    );
    await act(() => {
      sessionOf("side-chat-1").setDraft("쓰다 만 말");
    });
    await act(() => {
      sessionOf("side-chat-1").beginEdit(askedId);
    });

    await rerender(<Harness />);
    await rerender(<Harness open={[chatWithId("side-chat-1")]} />);

    expect(sessionOf("side-chat-1").draft).toBe("보낸 질문");
    expect(sessionOf("side-chat-1").editingMessageId).toBe(askedId);

    await act(() => {
      sessionOf("side-chat-1").cancelEdit();
    });

    expect(sessionOf("side-chat-1").draft).toBe("쓰다 만 말");
  });

  test("출처 답변이 사라지면 그 답변의 Side chat만 함께 지운다", async () => {
    const { rerender } = await render(<Harness />);
    await act(() => {
      start("assistant-1", "첫 답변의 구절");
      start("assistant-2", "두 번째 답변의 구절");
    });
    await rerender(
      <Harness open={[chatWithId("side-chat-1"), chatWithId("side-chat-2")]} />
    );
    await ask("side-chat-1", "첫 질문");
    await ask("side-chat-2", "두 번째 질문");
    await waitFor(() => {
      expect(store().askedChats).toHaveLength(2);
    });
    await rerender(<Harness />);

    // Regenerating the second answer drops it from the parent conversation,
    // which is exactly what a side chat hanging off it no longer has.
    await act(() => {
      store().dropChatsWithoutSource(WITHOUT_SECOND_ANSWER);
    });

    expect(store().askedChats.map((sideChat) => sideChat.phrase)).toEqual([
      "첫 답변의 구절",
    ]);
  });

  test("출처가 사라진 Side chat이 받고 있던 답변을 먼저 멈춘다", async () => {
    const answer = openAnswerStream();
    answers.push(() => Promise.resolve(answer.stream));
    const { rerender } = await render(<Harness />);
    await act(() => {
      start("assistant-2", "구절");
    });
    const opened = chatWithId("side-chat-1");
    await rerender(<Harness open={[opened]} />);
    await ask("side-chat-1", "질문");
    await waitFor(() => {
      expect(sessionOf("side-chat-1").isBusy).toBe(true);
    });
    await rerender(<Harness />);

    await act(() => {
      store().dropChatsWithoutSource(WITHOUT_SECOND_ANSWER);
    });

    await waitFor(() => {
      expect(opened.chat.status).not.toBe("streaming");
    });
    expect(store().chats).toHaveLength(0);
  });

  test("부모 채팅을 떠나면 받고 있던 답변을 모두 멈춘다", async () => {
    const answer = openAnswerStream();
    answers.push(() => Promise.resolve(answer.stream));
    const { rerender, unmount } = await render(<Harness />);
    await act(() => {
      start("assistant-1", "구절");
    });
    const opened = chatWithId("side-chat-1");
    await rerender(<Harness open={[opened]} />);
    await ask("side-chat-1", "질문");
    await waitFor(() => {
      expect(opened.chat.status).toBe("streaming");
    });

    unmount();

    await waitFor(() => {
      expect(opened.chat.status).not.toBe("streaming");
    });
  });
});
