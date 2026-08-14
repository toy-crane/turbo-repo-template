import { openURL } from "expo-linking";
import { useThemeColor } from "heroui-native/hooks";
import { useCallback, useMemo } from "react";
import { Platform } from "react-native";
import type {
  LinkPressEvent,
  MarkdownStyle,
} from "react-native-enriched-markdown";
import { StreamdownText } from "react-native-streamdown";

/**
 * The one place the app names a monospaced font; see
 * docs/decisions/mobile-typography.md. Code is the only text whose column
 * alignment is part of reading it.
 */
const CODE_FONT_FAMILY = Platform.select({
  default: "monospace",
  ios: "Menlo",
});
/** The body size and leading every message uses, as numbers the renderer takes. */
const BODY_FONT_SIZE = 16;
const BODY_LINE_HEIGHT = 24;
const CODE_PADDING = 12;
const CODE_RADIUS = 12;
const CELL_PADDING_HORIZONTAL = 10;
const CELL_PADDING_VERTICAL = 6;
const QUOTE_BORDER_WIDTH = 3;
const QUOTE_GAP = 12;

/**
 * An answer, drawn as Markdown while it is still arriving.
 *
 * `StreamdownText` completes whatever Markdown has not closed yet and hands the
 * result to the native renderer, so a half-written table or code fence shows
 * what has arrived instead of its raw characters. Both block kinds are left on
 * `progressive`: they grow row by row and line by line rather than appearing
 * whole at the end.
 *
 * The renderer ships light-mode colours and has no colour scheme of its own, so
 * every colour it draws comes from the app's semantic tokens here.
 */
export function MarkdownAnswer({
  markdown,
  testID,
}: {
  markdown: string;
  testID?: string;
}) {
  const [
    foregroundColor,
    mutedColor,
    surfaceColor,
    surfaceForegroundColor,
    borderColor,
    linkColor,
  ] = useThemeColor([
    "foreground",
    "muted",
    "surface",
    "surface-foreground",
    "border",
    "link",
  ]);
  const markdownStyle = useMemo<MarkdownStyle>(
    () => ({
      blockquote: {
        borderColor,
        borderWidth: QUOTE_BORDER_WIDTH,
        color: mutedColor,
        gapWidth: QUOTE_GAP,
      },
      code: {
        backgroundColor: surfaceColor,
        borderColor,
        color: surfaceForegroundColor,
        fontFamily: CODE_FONT_FAMILY,
      },
      codeBlock: {
        backgroundColor: surfaceColor,
        borderColor,
        borderRadius: CODE_RADIUS,
        borderWidth: 1,
        color: surfaceForegroundColor,
        fontFamily: CODE_FONT_FAMILY,
        padding: CODE_PADDING,
      },
      h1: { color: foregroundColor },
      h2: { color: foregroundColor },
      h3: { color: foregroundColor },
      h4: { color: foregroundColor },
      h5: { color: foregroundColor },
      h6: { color: foregroundColor },
      link: { color: linkColor, underline: true },
      list: {
        bulletColor: mutedColor,
        color: foregroundColor,
        markerColor: mutedColor,
      },
      paragraph: {
        color: foregroundColor,
        fontSize: BODY_FONT_SIZE,
        lineHeight: BODY_LINE_HEIGHT,
      },
      table: {
        borderColor,
        cellPaddingHorizontal: CELL_PADDING_HORIZONTAL,
        cellPaddingVertical: CELL_PADDING_VERTICAL,
        color: foregroundColor,
        headerBackgroundColor: surfaceColor,
        headerTextColor: surfaceForegroundColor,
      },
      thematicBreak: { color: borderColor },
    }),
    [
      borderColor,
      foregroundColor,
      linkColor,
      mutedColor,
      surfaceColor,
      surfaceForegroundColor,
    ]
  );
  const openLink = useCallback((event: LinkPressEvent) => {
    openURL(event.url).catch(() => {
      // An address the system cannot open leaves the answer on screen, which
      // is also what a person can act on: the link text is still there to copy.
    });
  }, []);

  return (
    <StreamdownText
      flavor="github"
      markdown={markdown}
      markdownStyle={markdownStyle}
      onLinkPress={openLink}
      streamingConfig={{
        codeBlockMode: "progressive",
        tableMode: "progressive",
      }}
      testID={testID}
    />
  );
}
