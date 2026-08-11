/**
 * biome-ignore-all lint/suspicious/noArrayIndexKey: a streaming message only
 * ever appends blocks or grows the last one, so the position inside the tree
 * is the stable identity for every node.
 */
import type {
  BlockContent,
  DefinitionContent,
  PhrasingContent,
  RootContent,
  Table,
} from "mdast";
import { useCallback, useMemo, useState } from "react";
import {
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  type TextLayoutEventData,
  View,
} from "react-native";

import { openExternalLink } from "../open-link";
import { CodeBlock, InlineCode } from "./code-block";
import { parseMarkdown } from "./parse-markdown";

/**
 * Static class maps rather than assembled strings: Uniwind only sees classes
 * it can find in the source, and a lookup keeps every node style in one
 * place.
 */
const headingClassByDepth: Record<number, string> = {
  1: "mt-4 mb-2 font-bold text-2xl text-foreground",
  2: "mt-4 mb-2 font-bold text-foreground text-xl",
  3: "mt-3 mb-1 font-semibold text-foreground text-lg",
  4: "mt-3 mb-1 font-semibold text-base text-foreground",
  5: "mt-2 mb-1 font-semibold text-base text-foreground",
  6: "mt-2 mb-1 font-semibold text-base text-muted",
};

const BODY_TEXT_CLASS = "text-base text-foreground leading-6";
const TABLE_CELL_WIDTH = 144;

function StreamingBlockCursor() {
  return (
    <View
      accessibilityElementsHidden
      className="absolute right-0 bottom-0 h-5 w-0 border-accent border-r-2"
      importantForAccessibility="no-hide-descendants"
      testID="chat-streaming-cursor"
    />
  );
}

function StreamingText({
  children,
  className,
  selectable = false,
}: {
  children: React.ReactNode;
  className: string;
  selectable?: boolean;
}) {
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState({ height: 0, left: 0, top: 0 });
  const captureOrigin = useCallback((event: LayoutChangeEvent) => {
    const { x, y } = event.nativeEvent.layout;

    setOrigin((current) =>
      current.x === x && current.y === y ? current : { x, y }
    );
  }, []);
  const captureLastLine = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const line = event.nativeEvent.lines.at(-1);

      if (!line) {
        return;
      }

      const nextCursor = {
        height: Math.max(12, line.height * 0.8),
        left: origin.x + line.x + line.width,
        top: origin.y + line.y + line.height * 0.1,
      };

      setCursor((current) =>
        current.height === nextCursor.height &&
        current.left === nextCursor.left &&
        current.top === nextCursor.top
          ? current
          : nextCursor
      );
    },
    [origin.x, origin.y]
  );

  return (
    <View>
      <Text
        className={className}
        onLayout={captureOrigin}
        onTextLayout={captureLastLine}
        selectable={selectable}
      >
        {children}
      </Text>
      <View
        accessibilityElementsHidden
        className="absolute w-0 border-accent border-r-2"
        importantForAccessibility="no-hide-descendants"
        style={cursor}
        testID="chat-streaming-cursor"
      />
    </View>
  );
}

function LinkText({
  children,
  url,
}: {
  children: React.ReactNode;
  url: string;
}) {
  const open = useCallback(() => {
    openExternalLink(url);
  }, [url]);

  return (
    <Text
      accessibilityRole="link"
      className="text-link underline"
      onPress={open}
      suppressHighlighting
    >
      {children}
    </Text>
  );
}

/** Phrasing content becomes nested Text nodes, so styles inherit. */
function renderInline(
  nodes: PhrasingContent[],
  parentKey: string
): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${parentKey}-${node.type}-${index}`;

    switch (node.type) {
      case "break":
        return "\n";
      case "emphasis":
        return (
          <Text className="italic" key={key}>
            {renderInline(node.children, key)}
          </Text>
        );
      case "inlineCode":
        return <InlineCode key={key} value={node.value} />;
      case "link":
        return (
          <LinkText key={key} url={node.url}>
            {renderInline(node.children, key)}
          </LinkText>
        );
      case "strong":
        return (
          <Text className="font-semibold" key={key}>
            {renderInline(node.children, key)}
          </Text>
        );
      case "text":
        return node.value;
      default:
        return renderInlineFallback(node, key);
    }
  });
}

/**
 * Whatever the cases above did not name, drawn from whatever the node carries.
 *
 * Reading `value` alone loses whole words mid-sentence: a reference link
 * (`[여기][ref]`) keeps its text in `children` and has no `value`, and an
 * image has neither — only `alt`. Both have to leave something readable
 * behind rather than a hole in the paragraph.
 */
function renderInlineFallback(
  node: PhrasingContent,
  key: string
): React.ReactNode {
  if ("children" in node && node.children.length > 0) {
    return <Text key={key}>{renderInline(node.children, key)}</Text>;
  }

  if ("value" in node) {
    return node.value;
  }

  return "alt" in node && node.alt ? node.alt : null;
}

function MarkdownTable({
  node,
  parentKey,
}: {
  node: Table;
  parentKey: string;
}) {
  const [headerRow, ...bodyRows] = node.children;

  return (
    <ScrollView
      className="my-2"
      horizontal
      showsHorizontalScrollIndicator
      testID="chat-markdown-table"
    >
      <View className="rounded-lg border border-separator">
        {headerRow ? (
          <View className="flex-row border-separator border-b">
            {headerRow.children.map((cell, cellIndex) => (
              <View
                className="px-3 py-2"
                key={`${parentKey}-h-${cellIndex}`}
                style={{ width: TABLE_CELL_WIDTH }}
              >
                <Text className="font-semibold text-foreground text-sm">
                  {renderInline(cell.children, `${parentKey}-h-${cellIndex}`)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {bodyRows.map((row, rowIndex) => (
          <View
            className={
              rowIndex < bodyRows.length - 1
                ? "flex-row border-separator border-b"
                : "flex-row"
            }
            key={`${parentKey}-r-${rowIndex}`}
          >
            {row.children.map((cell, cellIndex) => (
              <View
                className="px-3 py-2"
                key={`${parentKey}-r-${rowIndex}-${cellIndex}`}
                style={{ width: TABLE_CELL_WIDTH }}
              >
                <Text className="text-foreground text-sm" selectable>
                  {renderInline(
                    cell.children,
                    `${parentKey}-r-${rowIndex}-${cellIndex}`
                  )}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function renderListItemContent(
  nodes: (BlockContent | DefinitionContent)[],
  parentKey: string,
  showCursor = false
) {
  return nodes.map((node, index) => (
    <BlockNode
      key={`${parentKey}-${index}`}
      node={node}
      parentKey={`${parentKey}-${index}`}
      showCursor={showCursor && index === nodes.length - 1}
    />
  ));
}

function BlockNode({
  node,
  parentKey,
  showCursor = false,
}: {
  node: RootContent;
  parentKey: string;
  showCursor?: boolean;
}) {
  switch (node.type) {
    case "blockquote":
      return (
        <View className="my-1 border-muted border-l-4 pl-3">
          {node.children.map((child, index) => (
            <BlockNode
              key={`${parentKey}-${index}`}
              node={child}
              parentKey={`${parentKey}-${index}`}
              showCursor={showCursor && index === node.children.length - 1}
            />
          ))}
        </View>
      );
    case "code":
      return (
        <View>
          <CodeBlock code={node.value} />
          {showCursor ? <StreamingBlockCursor /> : null}
        </View>
      );
    case "heading":
      if (showCursor) {
        return (
          <StreamingText
            className={headingClassByDepth[node.depth] ?? BODY_TEXT_CLASS}
            selectable
          >
            {renderInline(node.children, parentKey)}
          </StreamingText>
        );
      }

      return (
        <Text
          className={headingClassByDepth[node.depth] ?? BODY_TEXT_CLASS}
          selectable
        >
          {renderInline(node.children, parentKey)}
        </Text>
      );
    case "list": {
      const start = node.start ?? 1;

      return (
        <View className="my-1 gap-1">
          {node.children.map((item, index) => (
            <View className="flex-row" key={`${parentKey}-${index}`}>
              <Text className={`${BODY_TEXT_CLASS} w-6`}>
                {node.ordered ? `${start + index}.` : "•"}
              </Text>
              <View className="flex-1">
                {renderListItemContent(
                  item.children,
                  `${parentKey}-${index}`,
                  showCursor && index === node.children.length - 1
                )}
              </View>
            </View>
          ))}
        </View>
      );
    }
    case "paragraph":
      if (showCursor) {
        return (
          <StreamingText className={`${BODY_TEXT_CLASS} my-1`} selectable>
            {renderInline(node.children, parentKey)}
          </StreamingText>
        );
      }

      return (
        <Text className={`${BODY_TEXT_CLASS} my-1`} selectable>
          {renderInline(node.children, parentKey)}
        </Text>
      );
    case "table":
      return (
        <View>
          <MarkdownTable node={node} parentKey={parentKey} />
          {showCursor ? <StreamingBlockCursor /> : null}
        </View>
      );
    case "thematicBreak":
      return (
        <View>
          <View className="my-3 h-px bg-separator" />
          {showCursor ? <StreamingBlockCursor /> : null}
        </View>
      );
    default:
      if (!("value" in node) || typeof node.value !== "string") {
        return null;
      }

      return showCursor ? (
        <StreamingText className={BODY_TEXT_CLASS} selectable>
          {node.value}
        </StreamingText>
      ) : (
        <Text className={BODY_TEXT_CLASS} selectable>
          {node.value}
        </Text>
      );
  }
}

/**
 * An AI answer's text part, drawn as Markdown.
 *
 * Parsing is memoized on the text, so a row whose content did not change
 * never re-parses; the memoized message row above this keeps other rows from
 * re-rendering at all while one message streams.
 */
export function MarkdownView({
  markdown,
  showCursor = false,
}: {
  markdown: string;
  showCursor?: boolean;
}) {
  const tree = useMemo(() => parseMarkdown(markdown), [markdown]);

  return (
    <View testID="chat-markdown">
      {tree.children.map((node, index) => (
        // Position is the stable identity: streaming only ever appends or
        // grows the last block, so earlier keys keep their nodes.
        <BlockNode
          key={`b-${index}`}
          node={node}
          parentKey={`b-${index}`}
          showCursor={showCursor && index === tree.children.length - 1}
        />
      ))}
    </View>
  );
}
