import { expect, jest, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";
import { openURL } from "expo-linking";

import { renderWithHeroUI } from "@/shared/test/render-with-heroui";
import { testThemeVariables } from "@/shared/test/theme";
import { MarkdownAnswer } from "./markdown-answer";

jest.mock("expo-linking", () => ({
  openURL: jest.fn(() => Promise.resolve(true)),
}));

const mockOpenURL = jest.mocked(openURL);

async function renderAnswer(markdown = "답변") {
  await renderWithHeroUI(
    <MarkdownAnswer markdown={markdown} testID="chat-message-assistant" />
  );

  return screen.getByTestId("chat-message-assistant");
}

test("답변 본문을 그대로 Markdown 렌더러에 넘긴다", async () => {
  const answer = await renderAnswer("# 제목\n\n- 하나\n- 둘");

  expect(answer.props.markdown).toBe("# 제목\n\n- 하나\n- 둘");
});

test("GitHub Flavored Markdown으로 해석한다", async () => {
  const answer = await renderAnswer();

  expect(answer.props.flavor).toBe("github");
});

// Hiding either until it closes would leave a gap where the answer is still
// arriving, which is the opposite of reading it as it comes.
test("새 글자를 움직여 보여 주고 코드 블록과 표는 도착한 부분부터 그린다", async () => {
  const answer = await renderAnswer();

  expect(answer.props.streamingAnimation).toBe(true);
  expect(answer.props.streamingConfig).toEqual({
    codeBlockMode: "progressive",
    tableMode: "progressive",
  });
});

test("링크를 누르면 운영체제의 링크 열기로 보낸다", async () => {
  const answer = await renderAnswer("[문서](https://example.com/docs)");

  answer.props.onLinkPress({ url: "https://example.com/docs" });

  expect(mockOpenURL).toHaveBeenCalledWith("https://example.com/docs");
});

test("열지 못한 주소가 화면을 무너뜨리지 않는다", async () => {
  mockOpenURL.mockRejectedValueOnce(new Error("no handler"));
  const answer = await renderAnswer("[문서](weird://nothing)");

  expect(() =>
    answer.props.onLinkPress({ url: "weird://nothing" })
  ).not.toThrow();
});

// The renderer ships light-mode colours and has no colour scheme of its own, so
// every colour it draws has to be handed to it. These read the resolved value
// rather than merely a truthy one: a role the theme cannot resolve arrives as
// the string "invalid", which is truthy and would pass an emptiness check while
// the renderer draws nothing recognisable.
test("코드는 monospace로, 나머지는 앱의 시맨틱 색으로 그린다", async () => {
  const { markdownStyle } = (await renderAnswer()).props;

  expect(markdownStyle.code.fontFamily).toBeTruthy();
  expect(markdownStyle.codeBlock.fontFamily).toBe(
    markdownStyle.code.fontFamily
  );
  expect(markdownStyle.paragraph.color).toBe(
    testThemeVariables["--color-foreground"]
  );
  expect(markdownStyle.link.color).toBe(testThemeVariables["--color-link"]);
  expect(markdownStyle.table.borderColor).toBe(
    testThemeVariables["--color-border"]
  );
});
