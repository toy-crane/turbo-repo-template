import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { screen, userEvent, waitFor } from "@testing-library/react-native";
import type { UIMessageChunk } from "ai";
import { simulateReadableStream } from "ai";
import { useAuthSession } from "@/features/auth/auth-session";
import { createChatTransport } from "@/features/chat/chat-transport";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { chatLabels, HomeScreen } from "./home-screen";

jest.mock("@/features/auth/auth-session", () => ({
  useAuthSession: jest.fn(),
}));

jest.mock("@/features/chat/chat-transport", () => ({
  createChatTransport: jest.fn(),
}));

const mockUseAuthSession = jest.mocked(useAuthSession);
const mockCreateChatTransport = jest.mocked(createChatTransport);

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

function signedIn() {
  mockUseAuthSession.mockReturnValue({
    session: {
      access_token: "test-access-token",
      expires_in: 3600,
      refresh_token: "test-refresh-token",
      token_type: "bearer",
      user: {
        app_metadata: {},
        aud: "authenticated",
        created_at: "2026-01-01T00:00:00.000Z",
        id: "user-1",
        user_metadata: {},
      },
    },
    status: "signedIn",
  });
}

function useTransport(transport: ReturnType<typeof fakeTransport>) {
  mockCreateChatTransport.mockReturnValue(
    transport as unknown as ReturnType<typeof createChatTransport>
  );
}

describe("HomeScreen chat", () => {
  beforeEach(() => {
    signedIn();
  });

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

    await renderWithHeroUI(<HomeScreen />);

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

    await renderWithHeroUI(<HomeScreen />);

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

    await renderWithHeroUI(<HomeScreen />);

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

  test("세션이 사라지면 다시 보내기를 막는다", async () => {
    const transport = fakeTransport(() =>
      Promise.reject(new Error("network is down"))
    );

    useTransport(transport);

    const user = userEvent.setup();

    await renderWithHeroUI(<HomeScreen />);

    await user.type(screen.getByLabelText(chatLabels.input), "안녕");
    await user.press(screen.getByLabelText(chatLabels.send));

    await waitFor(() => {
      expect(screen.getByTestId("chat-error")).toBeOnTheScreen();
    });

    // The session goes away while the error is on screen. Typing is what makes
    // the screen render again with the new provider value.
    mockUseAuthSession.mockReturnValue({ session: null, status: "signedOut" });
    await user.type(screen.getByLabelText(chatLabels.input), "다시");

    expect(screen.getByLabelText(chatLabels.retry)).toBeDisabled();
    expect(transport.sendMessages).toHaveBeenCalledTimes(1);
  });

  test("세션이 없으면 요청을 보내지 않는다", async () => {
    mockUseAuthSession.mockReturnValue({ session: null, status: "signedOut" });

    const transport = fakeTransport(() =>
      Promise.resolve(answerStream(["안녕하세요"]))
    );

    useTransport(transport);

    const user = userEvent.setup();

    await renderWithHeroUI(<HomeScreen />);

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

    await renderWithHeroUI(<HomeScreen />);

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
