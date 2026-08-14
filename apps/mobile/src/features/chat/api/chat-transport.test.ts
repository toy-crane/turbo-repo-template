import { describe, expect, test } from "@jest/globals";
import type { UIMessage } from "ai";

import { prependParentSnapshot } from "./chat-transport";

function textMessage(
  id: string,
  role: "assistant" | "user",
  text: string
): UIMessage {
  return { id, parts: [{ text, type: "text" }], role };
}

const PARENT_QUESTION = textMessage("user-1", "user", "부모 질문");
const PARENT_ANSWER = textMessage("assistant-1", "assistant", "부모 답변");
const SIDE_QUESTION = textMessage("side-1", "user", "구절에 대한 질문");

function request(messages: UIMessage[]) {
  return {
    api: "http://127.0.0.1:3900/ai/chat",
    body: undefined,
    credentials: undefined,
    headers: undefined,
    id: "side-chat-1",
    messageId: undefined,
    messages,
    requestMetadata: undefined,
    trigger: "submit-message" as const,
  };
}

describe("prependParentSnapshot", () => {
  test("부모 스냅샷을 Side chat 메시지 앞에 붙여 보낸다", () => {
    const prepare = prependParentSnapshot([PARENT_QUESTION, PARENT_ANSWER]);

    const prepared = prepare(request([SIDE_QUESTION]));

    expect(prepared).toMatchObject({
      body: {
        id: "side-chat-1",
        messages: [PARENT_QUESTION, PARENT_ANSWER, SIDE_QUESTION],
        trigger: "submit-message",
      },
    });
  });

  // The snapshot is the parent conversation as it read when the side chat
  // opened. Sending it every time is what keeps the side chat's own list free
  // of it without the model losing what the phrase was part of.
  test("답변을 다시 받을 때도 같은 스냅샷을 보낸다", () => {
    const snapshot = [PARENT_QUESTION, PARENT_ANSWER];
    const prepare = prependParentSnapshot(snapshot);

    const prepared = prepare({
      ...request([SIDE_QUESTION]),
      messageId: "side-2",
      trigger: "regenerate-message",
    });

    expect(prepared).toMatchObject({
      body: {
        messageId: "side-2",
        messages: [PARENT_QUESTION, PARENT_ANSWER, SIDE_QUESTION],
        trigger: "regenerate-message",
      },
    });
  });

  test("스냅샷을 바꾸지 않고 새 배열로 보낸다", () => {
    const snapshot = [PARENT_QUESTION];
    const prepare = prependParentSnapshot(snapshot);

    prepare(request([SIDE_QUESTION]));

    expect(snapshot).toEqual([PARENT_QUESTION]);
  });
});
