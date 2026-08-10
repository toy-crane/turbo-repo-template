import { afterEach, describe, expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import type { UIMessageChunk } from "ai";
import { simulateReadableStream } from "ai";

import { createChatTransport } from "@/features/chat/api/chat-transport";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ChatPanel, chatLabels } from "./chat-panel";

jest.mock("@/features/chat/api/chat-transport", () => ({
  createChatTransport: jest.fn(),
}));

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

/**
 * The virtual list draws rows only after it learns its size, which never
 * happens on its own under Jest. Firing one layout event stands in for the
 * native measurement.
 */
function layoutList() {
  fireEvent(screen.getByTestId("chat-list"), "layout", {
    nativeEvent: { layout: { height: 800, width: 400, x: 0, y: 0 } },
  });
}

describe("ChatPanel", () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockPartRenderCounts.clear();
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

    layoutList();

    await waitFor(() => {
      expect(screen.getByText("안녕")).toBeOnTheScreen();
    });
    expect(screen.getByTestId("chat-generating")).toBeOnTheScreen();

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

    layoutList();

    await waitFor(() => {
      expect(screen.getByText("안녕")).toBeOnTheScreen();
    });
    expect(screen.getByLabelText(chatLabels.retry)).toBeEnabled();
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

    layoutList();

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

    layoutList();

    await waitFor(() => {
      expect(screen.getByText("안녕하세요")).toBeOnTheScreen();
    });
  });

  test("대화가 비어 있으면 제목과 짧은 안내만 보여준다", async () => {
    useTransport(
      fakeTransport(() => Promise.resolve(answerStream(["안녕하세요"])))
    );

    await renderChat(ACCESS_TOKEN);

    expect(screen.getByText("무엇을 도와드릴까요?")).toBeOnTheScreen();
    expect(
      screen.getByText("궁금한 것을 입력하면 AI가 바로 답합니다.")
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("chat-list")).not.toBeOnTheScreen();
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
    expect(screen.queryByTestId("chat-send")).not.toBeOnTheScreen();

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

    layoutList();

    await waitFor(() => {
      expect(screen.getByText("부분 답변")).toBeOnTheScreen();
    });

    await user.press(screen.getByLabelText(chatLabels.stop));

    await waitFor(() => {
      expect(screen.getByLabelText(chatLabels.send)).toBeOnTheScreen();
    });

    // The partial answer stays, and nothing reads as a failure.
    expect(screen.getByText("부분 답변")).toBeOnTheScreen();
    expect(screen.queryByTestId("chat-error")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("chat-generating")).not.toBeOnTheScreen();
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

    layoutList();

    await waitFor(() => {
      expect(screen.getByText("첫 답변")).toBeOnTheScreen();
    });

    // Everything rendered so far belongs to the finished exchange.
    const baseline = new Map(mockPartRenderCounts);

    expect(baseline.size).toBeGreaterThan(0);

    await user.type(screen.getByLabelText(chatLabels.input), "둘째 질문");
    await user.press(screen.getByLabelText(chatLabels.send));

    second.push({ type: "start" });
    second.push({ id: "0", type: "text-start" });
    second.push({ delta: "둘째", id: "0", type: "text-delta" });

    await waitFor(() => {
      expect(screen.getByText("둘째")).toBeOnTheScreen();
    });

    second.push({ delta: " 답변", id: "0", type: "text-delta" });

    await waitFor(() => {
      expect(screen.getByText("둘째 답변")).toBeOnTheScreen();
    });

    second.push({ id: "0", type: "text-end" });
    second.push({ type: "finish" });
    second.close();

    await waitFor(() => {
      expect(screen.queryByTestId("chat-generating")).not.toBeOnTheScreen();
    });

    // The second exchange streamed in, and the first exchange's rows never
    // rendered again.
    for (const [messageId, count] of baseline) {
      expect(mockPartRenderCounts.get(messageId)).toBe(count);
    }
  });
});
