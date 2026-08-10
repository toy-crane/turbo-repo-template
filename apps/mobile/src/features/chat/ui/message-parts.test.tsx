import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { screen, userEvent } from "@testing-library/react-native";
import type { UIMessage } from "ai";
import { openBrowserAsync } from "expo-web-browser";
import { Text } from "react-native";

import { collectTestIds } from "@/shared/test/collect-test-ids";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { MessageRow } from "./message-row";
import {
  type AnyToolUIPart,
  registerToolRenderer,
  resetToolRenderers,
} from "./tool-registry";

const mockOpenBrowser = jest.mocked(openBrowserAsync);

const PART_MARKER_PATTERN = /^chat-(part|message)-/;

function assistantMessage(parts: UIMessage["parts"]): UIMessage {
  return { id: "a1", parts, role: "assistant" };
}

function renderParts(parts: UIMessage["parts"]) {
  return renderWithHeroUI(<MessageRow message={assistantMessage(parts)} />);
}

describe("MessagePart", () => {
  afterEach(() => {
    jest.clearAllMocks();
    resetToolRenderers();
  });

  test("파일 part는 파일 이름, 종류와 열기 작업을 보여준다", async () => {
    const user = userEvent.setup();

    await renderParts([
      {
        filename: "보고서.pdf",
        mediaType: "application/pdf",
        type: "file",
        url: "https://example.com/files/보고서.pdf",
      },
    ]);

    expect(screen.getByText("보고서.pdf")).toBeOnTheScreen();
    expect(screen.getByText("application/pdf")).toBeOnTheScreen();

    await user.press(screen.getByLabelText("보고서.pdf 파일 열기"));

    expect(mockOpenBrowser).toHaveBeenCalledWith(
      "https://example.com/files/보고서.pdf"
    );
  });

  test("이름 없는 파일 part는 주소의 마지막 조각을 이름으로 쓴다", async () => {
    await renderParts([
      {
        mediaType: "image/png",
        type: "file",
        url: "https://example.com/assets/chart.png",
      },
    ]);

    expect(screen.getByText("chart.png")).toBeOnTheScreen();
  });

  test("source-url part는 제목과 주소를 보여주고 원문을 연다", async () => {
    const user = userEvent.setup();

    await renderParts([
      {
        sourceId: "s1",
        title: "공식 문서",
        type: "source-url",
        url: "https://example.com/docs",
      },
    ]);

    expect(screen.getByText("공식 문서")).toBeOnTheScreen();
    expect(screen.getByText("https://example.com/docs")).toBeOnTheScreen();

    await user.press(screen.getByLabelText("출처 공식 문서 열기"));

    expect(mockOpenBrowser).toHaveBeenCalledWith("https://example.com/docs");
  });

  test("source-document part는 제목과 파일 정보를 보여준다", async () => {
    await renderParts([
      {
        filename: "guide.md",
        mediaType: "text/markdown",
        sourceId: "s2",
        title: "안내 문서",
        type: "source-document",
      },
    ]);

    expect(screen.getByText("안내 문서")).toBeOnTheScreen();
    expect(screen.getByText("guide.md")).toBeOnTheScreen();
  });

  test("도구 part는 실행 중, 완료, 실패 상태를 구분해 보여준다", async () => {
    await renderParts([
      {
        input: { city: "서울" },
        state: "input-available",
        toolCallId: "t1",
        type: "tool-weather",
      },
      {
        input: { city: "부산" },
        output: { temperature: 23 },
        state: "output-available",
        toolCallId: "t2",
        type: "tool-weather",
      },
      {
        errorText: "요청이 실패했습니다",
        input: { city: "대전" },
        state: "output-error",
        toolCallId: "t3",
        type: "tool-weather",
      },
    ] as UIMessage["parts"]);

    expect(screen.getByText("실행 중")).toBeOnTheScreen();
    expect(screen.getByText("완료")).toBeOnTheScreen();
    expect(screen.getByText('{"temperature":23}')).toBeOnTheScreen();
    expect(screen.getByText("실패")).toBeOnTheScreen();
    expect(screen.getByText("요청이 실패했습니다")).toBeOnTheScreen();
  });

  test("등록한 도구 렌더러가 기본 표시를 대체한다", async () => {
    registerToolRenderer("weather", ({ part }: { part: AnyToolUIPart }) => (
      <Text>전용 날씨 화면 {part.toolCallId}</Text>
    ));

    await renderParts([
      {
        input: {},
        output: { temperature: 23 },
        state: "output-available",
        toolCallId: "t9",
        type: "tool-weather",
      },
    ] as UIMessage["parts"]);

    expect(screen.getByText("전용 날씨 화면 t9")).toBeOnTheScreen();
    expect(
      screen.queryByTestId("chat-part-tool-weather")
    ).not.toBeOnTheScreen();
  });

  test("승인 대기 상태는 승인·거절 버튼 없이 상태만 보여준다", async () => {
    await renderParts([
      {
        approval: { id: "ap1" },
        input: { command: "rm -rf" },
        state: "approval-requested",
        toolCallId: "t4",
        type: "tool-shell",
      },
    ] as UIMessage["parts"]);

    expect(screen.getByText("확인을 기다리는 중")).toBeOnTheScreen();
    expect(screen.queryByText("승인")).not.toBeOnTheScreen();
    expect(screen.queryByText("거절")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  });

  test("step-start는 아무것도 그리지 않고 data part는 기본 표시로 남는다", async () => {
    await renderParts([
      { type: "step-start" },
      { data: { chart: [1, 2, 3] }, type: "data-chart" },
      { text: "뒤 텍스트", type: "text" },
    ] as UIMessage["parts"]);

    expect(
      screen.getByText("아직 표시할 수 없는 내용입니다.")
    ).toBeOnTheScreen();
    expect(screen.getByText("뒤 텍스트")).toBeOnTheScreen();
  });

  test("텍스트, 파일, 출처, 도구가 섞여도 들어온 순서대로 그린다", async () => {
    await renderParts([
      { text: "먼저 설명", type: "text" },
      {
        mediaType: "application/pdf",
        type: "file",
        url: "https://example.com/a.pdf",
      },
      {
        sourceId: "s1",
        title: "출처 하나",
        type: "source-url",
        url: "https://example.com/one",
      },
      {
        input: {},
        output: "완료 결과",
        state: "output-available",
        toolCallId: "t1",
        type: "tool-search",
      },
      { text: "마지막 정리", type: "text" },
    ] as UIMessage["parts"]);

    const markers = [
      "chat-message-assistant",
      "chat-part-file",
      "chat-part-source-url",
      "chat-part-tool-search",
    ];
    const order = collectTestIds(PART_MARKER_PATTERN, (testId) =>
      markers.includes(testId)
    );

    expect(order).toEqual([
      "chat-message-assistant",
      "chat-part-file",
      "chat-part-source-url",
      "chat-part-tool-search",
      "chat-message-assistant",
    ]);
  });
});
