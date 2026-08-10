import { setStringAsync } from "expo-clipboard";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import { chatLabels } from "../chat-labels";

/**
 * The one and only monospace declaration in the app: the typography decision
 * allows monospace for code display alone, specified in a single place.
 */
const CODE_FONT_FAMILY = Platform.select({
  default: "monospace",
  ios: "Menlo",
});

const COPIED_FEEDBACK_MS = 2000;

/** Inline code inside a sentence. Same font rule, no copy control. */
export function InlineCode({ value }: { value: string }) {
  return (
    <Text
      className="rounded bg-surface-secondary text-surface-secondary-foreground"
      style={{ fontFamily: CODE_FONT_FAMILY }}
    >
      {` ${value} `}
    </Text>
  );
}

/**
 * A fenced code block: system monospace, horizontal scrolling for long lines
 * and a button that copies exactly this block.
 */
export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(
    () => () => {
      if (resetTimer.current !== undefined) {
        clearTimeout(resetTimer.current);
      }
    },
    []
  );

  const copy = useCallback(() => {
    setStringAsync(code)
      .then(() => {
        setCopied(true);

        if (resetTimer.current !== undefined) {
          clearTimeout(resetTimer.current);
        }

        resetTimer.current = setTimeout(() => {
          setCopied(false);
        }, COPIED_FEEDBACK_MS);
      })
      .catch(() => undefined);
  }, [code]);

  return (
    <View className="my-2 rounded-xl bg-surface-secondary">
      <View className="flex-row items-center justify-end px-2 pt-1">
        <Pressable
          accessibilityLabel={chatLabels.copyCode}
          accessibilityRole="button"
          className="min-h-11 min-w-11 items-center justify-center px-2"
          onPress={copy}
          testID="chat-code-copy"
        >
          {/* The copied state is words, not a color, so every reader gets it. */}
          <Text className="text-muted-foreground text-xs">
            {copied ? "복사됨" : "코드 복사"}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 12, paddingHorizontal: 12 }}
        horizontal
        showsHorizontalScrollIndicator
      >
        <Text
          className="text-sm text-surface-secondary-foreground leading-5"
          selectable
          style={{ fontFamily: CODE_FONT_FAMILY }}
        >
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}
