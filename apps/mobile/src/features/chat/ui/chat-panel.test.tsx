import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { screen, userEvent, waitFor } from "@testing-library/react-native";
import type { UIMessageChunk } from "ai";
import { simulateReadableStream } from "ai";

import { createChatTransport } from "@/features/chat/api/chat-transport";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { ChatPanel, chatLabels } from "./chat-panel";

jest.mock("@/features/chat/api/chat-transport", () => ({
  createChatTransport: jest.fn(),
}));

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

function renderChat(accessToken: string | undefined) {
  return renderWithHeroUI(<ChatPanel accessToken={accessToken} />);
}

describe("ChatPanel", () => {
  afterEach(() => {
    jest.clearAllMocks();
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

    expect(screen.getByText("안녕")).toBeOnTheScreen();
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

    expect(screen.getByText("안녕")).toBeOnTheScreen();
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
    await view.rerender(<ChatPanel accessToken={undefined} />);

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

    await user.press(send);
    await user.press(send);

    expect(transport.sendMessages).toHaveBeenCalledTimes(1);

    release?.();

    await waitFor(() => {
      expect(screen.getByText("안녕하세요")).toBeOnTheScreen();
    });
  });
});
