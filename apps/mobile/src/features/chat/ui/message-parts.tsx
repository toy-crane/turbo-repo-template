import {
  type FileUIPart,
  getToolOrDynamicToolName,
  isDataUIPart,
  isFileUIPart,
  isTextUIPart,
  isToolUIPart,
  type SourceDocumentUIPart,
  type SourceUrlUIPart,
  type UIMessage,
} from "ai";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { MarkdownView } from "./markdown/markdown-view";
import { openExternalLink } from "./open-link";
import { type AnyToolUIPart, getToolRenderer } from "./tool-registry";

type MessagePartValue = UIMessage["parts"][number];

/** What the person reads for each tool state; never a color alone. */
const toolStateLabels: Record<AnyToolUIPart["state"], string> = {
  "approval-requested": "확인을 기다리는 중",
  "approval-responded": "확인에 응답함",
  "input-available": "실행 중",
  "input-streaming": "실행 준비 중",
  "output-available": "완료",
  "output-denied": "실행하지 않음",
  "output-error": "실패",
};

function describeToolOutput(output: unknown): string {
  if (output === undefined || output === null) {
    return "";
  }

  if (typeof output === "string") {
    return output;
  }

  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
}

function fileDisplayName(part: FileUIPart): string {
  if (part.filename) {
    return part.filename;
  }

  // A streamed file part has no filename, so the address's last segment is
  // the closest thing to a name the person can recognize.
  const lastSegment = part.url.split("/").at(-1);

  return lastSegment && lastSegment.length > 0 ? lastSegment : "파일";
}

function FilePart({ part }: { part: FileUIPart }) {
  const open = useCallback(() => {
    openExternalLink(part.url);
  }, [part.url]);

  return (
    <View
      className="my-1 flex-row items-center gap-3 rounded-xl bg-surface px-4 py-3"
      testID="chat-part-file"
    >
      <View className="flex-1">
        <Text className="font-medium text-surface-foreground" selectable>
          {fileDisplayName(part)}
        </Text>
        <Text className="text-muted-foreground text-xs">{part.mediaType}</Text>
      </View>
      <Pressable
        accessibilityLabel={`${fileDisplayName(part)} 파일 열기`}
        accessibilityRole="button"
        className="min-h-11 items-center justify-center px-2"
        onPress={open}
      >
        <Text className="text-link">열기</Text>
      </Pressable>
    </View>
  );
}

function SourceUrlPart({ part }: { part: SourceUrlUIPart }) {
  const open = useCallback(() => {
    openExternalLink(part.url);
  }, [part.url]);

  return (
    <Pressable
      accessibilityLabel={`출처 ${part.title ?? part.url} 열기`}
      accessibilityRole="link"
      className="my-1 min-h-11 justify-center rounded-xl bg-surface px-4 py-2"
      onPress={open}
      testID="chat-part-source-url"
    >
      <Text className="font-medium text-surface-foreground" selectable>
        {part.title ?? part.url}
      </Text>
      <Text className="text-muted-foreground text-xs" numberOfLines={1}>
        {part.url}
      </Text>
    </Pressable>
  );
}

function SourceDocumentPart({ part }: { part: SourceDocumentUIPart }) {
  return (
    <View
      className="my-1 justify-center rounded-xl bg-surface px-4 py-2"
      testID="chat-part-source-document"
    >
      <Text className="font-medium text-surface-foreground" selectable>
        {part.title}
      </Text>
      <Text className="text-muted-foreground text-xs">
        {part.filename ?? part.mediaType}
      </Text>
    </View>
  );
}

/**
 * The safe default for any tool: name, readable state and the result.
 * Approval states render as plain status text — this app never shows
 * approve or reject controls.
 */
function DefaultToolPart({ part }: { part: AnyToolUIPart }) {
  const toolName = getToolOrDynamicToolName(part);
  const output =
    part.state === "output-available" ? describeToolOutput(part.output) : "";

  return (
    <View
      className="my-1 rounded-xl bg-surface px-4 py-3"
      testID={`chat-part-tool-${toolName}`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-medium text-surface-foreground">{toolName}</Text>
        <Text className="text-muted-foreground text-xs">
          {toolStateLabels[part.state]}
        </Text>
      </View>
      {output ? (
        <Text className="mt-1 text-sm text-surface-foreground" selectable>
          {output}
        </Text>
      ) : null}
      {part.state === "output-error" ? (
        <Text className="mt-1 text-danger text-sm" selectable>
          {part.errorText}
        </Text>
      ) : null}
    </View>
  );
}

function ToolPart({ part }: { part: AnyToolUIPart }) {
  const Renderer = getToolRenderer(getToolOrDynamicToolName(part));

  if (Renderer) {
    return <Renderer part={part} />;
  }

  return <DefaultToolPart part={part} />;
}

/**
 * One part of a message, drawn by kind and in the order it arrived.
 *
 * The MVP server only ever sends text; file, source and tool parts exist so
 * the UI keeps kind and order the day a server starts sending them. Anything
 * this app does not recognize — `data-*`, future kinds — gets a quiet
 * placeholder instead of taking the screen down.
 */
export function MessagePart({
  messageId,
  part,
  role,
}: {
  messageId: string;
  part: MessagePartValue;
  role: UIMessage["role"];
}) {
  if (isTextUIPart(part)) {
    // Only the AI's answers carry Markdown; what the person typed stays
    // exactly as they typed it.
    if (role === "assistant") {
      return (
        <View testID="chat-message-assistant">
          <MarkdownView markdown={part.text} />
        </View>
      );
    }

    return (
      <Text
        className={
          role === "user"
            ? "text-accent-foreground"
            : "text-base text-foreground leading-6"
        }
        selectable
        testID={`chat-message-${role}`}
      >
        {part.text}
      </Text>
    );
  }

  if (isFileUIPart(part)) {
    return <FilePart part={part} />;
  }

  if (part.type === "source-url") {
    return <SourceUrlPart part={part} />;
  }

  if (part.type === "source-document") {
    return <SourceDocumentPart part={part} />;
  }

  if (isToolUIPart(part)) {
    return <ToolPart part={part} />;
  }

  // `step-start` is a boundary marker, not content.
  if (part.type === "step-start") {
    return null;
  }

  if (isDataUIPart(part)) {
    return (
      <Text
        className="text-muted-foreground text-sm"
        testID={`chat-part-unsupported-${messageId}`}
      >
        아직 표시할 수 없는 내용입니다.
      </Text>
    );
  }

  return (
    <Text
      className="text-muted-foreground text-sm"
      testID={`chat-part-unsupported-${messageId}`}
    >
      아직 표시할 수 없는 내용입니다.
    </Text>
  );
}
