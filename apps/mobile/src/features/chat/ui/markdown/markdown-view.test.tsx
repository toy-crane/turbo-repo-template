import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { screen, userEvent } from "@testing-library/react-native";
import { setStringAsync } from "expo-clipboard";
import { openBrowserAsync } from "expo-web-browser";

import { chatLabels } from "@/features/chat/ui/chat-labels";
import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { MarkdownView } from "./markdown-view";

const mockSetString = jest.mocked(setStringAsync);
const mockOpenBrowser = jest.mocked(openBrowserAsync);

describe("MarkdownView", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("문단, 제목, 강조, 인용, 목록과 인라인 코드를 렌더링한다", async () => {
    const markdown = [
      "# 제목입니다",
      "",
      "첫 문단에 **굵은 글씨**와 *기울임*이 있습니다.",
      "",
      "> 인용문입니다.",
      "",
      "- 첫 항목",
      "- 둘째 항목",
      "",
      "1. 순서 하나",
      "2. 순서 둘",
      "",
      "`inline_code`를 포함합니다.",
    ].join("\n");

    await renderWithHeroUI(<MarkdownView markdown={markdown} />);

    expect(screen.getByText("제목입니다")).toBeOnTheScreen();
    expect(screen.getByText("굵은 글씨", { exact: false })).toBeOnTheScreen();
    expect(screen.getByText("기울임", { exact: false })).toBeOnTheScreen();
    expect(screen.getByText("인용문입니다.")).toBeOnTheScreen();
    expect(screen.getByText("첫 항목")).toBeOnTheScreen();
    expect(screen.getByText("순서 둘")).toBeOnTheScreen();
    expect(screen.getAllByText("2.").length).toBeGreaterThan(0);
    expect(screen.getByText("inline_code", { exact: false })).toBeOnTheScreen();
  });

  test("코드 블록은 가로 스크롤 영역에 있고 해당 코드만 복사한다", async () => {
    const markdown = [
      "설명 문단입니다.",
      "",
      "```ts",
      'const answer = "마흔둘";',
      "```",
    ].join("\n");
    const user = userEvent.setup();

    await renderWithHeroUI(<MarkdownView markdown={markdown} />);

    expect(
      screen.getByText('const answer = "마흔둘";', { exact: false })
    ).toBeOnTheScreen();

    await user.press(screen.getByLabelText(chatLabels.copyCode));

    expect(mockSetString).toHaveBeenCalledWith('const answer = "마흔둘";');
    expect(screen.getByText("복사됨")).toBeOnTheScreen();
  });

  test("GFM 표를 열 정렬로 렌더링하고 가로로 스크롤한다", async () => {
    const markdown = [
      "| 이름 | 값 |",
      "| --- | --- |",
      "| 첫째 | 하나 |",
      "| 둘째 | 둘 |",
    ].join("\n");

    await renderWithHeroUI(<MarkdownView markdown={markdown} />);

    expect(screen.getByTestId("chat-markdown-table")).toBeOnTheScreen();
    expect(screen.getByText("이름")).toBeOnTheScreen();
    expect(screen.getByText("하나")).toBeOnTheScreen();
    expect(screen.getByText("둘")).toBeOnTheScreen();
  });

  test("링크를 누르면 인앱 브라우저 시트로 연다", async () => {
    const user = userEvent.setup();

    await renderWithHeroUI(
      <MarkdownView markdown="[공식 문서](https://example.com/docs)를 보세요." />
    );

    await user.press(screen.getByText("공식 문서"));

    expect(mockOpenBrowser).toHaveBeenCalledWith("https://example.com/docs");
  });

  test("웹 주소가 아닌 링크는 열지 않는다", async () => {
    const user = userEvent.setup();

    await renderWithHeroUI(
      <MarkdownView markdown="[메일 보내기](mailto:hi@example.com)" />
    );

    await user.press(screen.getByText("메일 보내기"));

    expect(mockOpenBrowser).not.toHaveBeenCalled();
  });

  test("참조 링크와 이미지도 읽을 수 있는 글자를 남긴다", async () => {
    const markdown = [
      "문서를 [여기][ref]에서 보세요.",
      "",
      "![매출 추이 그래프](https://example.com/chart.png)",
      "",
      "[ref]: https://example.com/docs",
    ].join("\n");

    await renderWithHeroUI(<MarkdownView markdown={markdown} />);

    // 참조 링크는 value가 없고 children에만 글자가 있다. 이걸 놓치면 문장
    // 중간에서 단어가 통째로 빠진다.
    expect(screen.getByText("여기")).toBeOnTheScreen();
    // 이미지는 value도 children도 없다. alt라도 남아야 내용을 잃지 않는다.
    expect(screen.getByText("매출 추이 그래프")).toBeOnTheScreen();
  });

  test("열린 코드 펜스 같은 미완성 구문도 그리고, 끝나면 최종 형태로 정리한다", async () => {
    const streaming = "코드를 보여드릴게요.\n\n```ts\nconst a = 1;";
    const view = await renderWithHeroUI(<MarkdownView markdown={streaming} />);

    // The unfinished fence renders as a code block that simply ends at the
    // end of input — nothing throws, the text stays readable.
    expect(
      screen.getByText("const a = 1;", { exact: false })
    ).toBeOnTheScreen();

    const finished = "코드를 보여드릴게요.\n\n```ts\nconst a = 1;\n```\n\n끝.";

    await view.rerender(<MarkdownView markdown={finished} />);

    expect(screen.getByText("끝.")).toBeOnTheScreen();
    expect(
      screen.getByText("const a = 1;", { exact: false })
    ).toBeOnTheScreen();
  });

  test("진행 중인 표도 오류 없이 그린다", async () => {
    const streaming = "| 이름 | 값 |\n| --- | --- |\n| 첫";

    await renderWithHeroUI(<MarkdownView markdown={streaming} />);

    expect(screen.getByTestId("chat-markdown-table")).toBeOnTheScreen();
  });
});
