import { expect, test } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import type { UIMessage } from "ai";

import { useEnteringMessage } from "./use-entering-message";

function textMessage(
  id: string,
  role: "assistant" | "user",
  text: string
): UIMessage {
  return { id, parts: [{ text, type: "text" }], role };
}

const firstQuestion = textMessage("user-1", "user", "첫 질문");
const firstAnswer = textMessage("assistant-1", "assistant", "첫 답변");

function renderEntering(messages: UIMessage[]) {
  return renderHook((current: UIMessage[]) => useEnteringMessage(current), {
    initialProps: messages,
  });
}

test("보내기 전에는 어떤 메시지도 들어오지 않는다", async () => {
  const { result } = await renderEntering([firstQuestion, firstAnswer]);

  expect(result.current.enteringMessageId).toBeUndefined();
});

test("보낸 뒤 새로 생긴 질문 하나만 들어온다", async () => {
  const { rerender, result } = await renderEntering([
    firstQuestion,
    firstAnswer,
  ]);

  await act(() => result.current.markSent());
  await rerender([
    firstQuestion,
    firstAnswer,
    textMessage("user-2", "user", "두 번째 질문"),
  ]);

  expect(result.current.enteringMessageId).toBe("user-2");
});

// The list can rebuild a row long after it arrived, and the question that came
// in once does not come in again each time that happens.
test("한 번 들어왔다고 알리면 그 질문도 더는 들어오지 않는다", async () => {
  const { rerender, result } = await renderEntering([firstQuestion]);

  await act(() => result.current.markSent());
  await rerender([
    firstQuestion,
    textMessage("user-2", "user", "두 번째 질문"),
  ]);
  await act(() => result.current.markEntered());

  expect(result.current.enteringMessageId).toBeUndefined();
});

// Sending from the edit state drops messages before it adds one, so counting
// them would miss this send entirely.
test("수정해서 다시 보내 대화가 짧아져도 새 질문을 찾는다", async () => {
  const { rerender, result } = await renderEntering([
    firstQuestion,
    firstAnswer,
    textMessage("user-2", "user", "두 번째 질문"),
    textMessage("assistant-2", "assistant", "두 번째 답변"),
  ]);

  await act(() => result.current.markSent());
  await rerender([
    firstQuestion,
    firstAnswer,
    textMessage("user-3", "user", "고친 질문"),
  ]);

  expect(result.current.enteringMessageId).toBe("user-3");
});

test("답변만 도착하면 아무것도 들어오지 않는다", async () => {
  const { rerender, result } = await renderEntering([firstQuestion]);

  await act(() => result.current.markSent());
  await rerender([firstQuestion, firstAnswer]);

  expect(result.current.enteringMessageId).toBeUndefined();
});
