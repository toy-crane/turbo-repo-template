/** A fenced block goes whole: a code sample is not a line of conversation. */
const FENCED_CODE = /```[\s\S]*?(?:```|$)/g;
const INLINE_CODE = /`+([^`]*)`+/g;
const IMAGE = /!\[([^\]]*)]\([^)]*\)/g;
const LINK = /\[([^\]]*)]\([^)]*\)/g;
/** Heading hashes, blockquote arrows and list bullets at the head of a line. */
const LINE_LEAD = /^[ \t]*(?:[>#]+[ \t]*|[-*+][ \t]+|\d+\.[ \t]+)+/gm;
/** Only paired marks, so `a => b` and `5 * 3` keep their characters. */
const EMPHASIS = /(\*{1,3}|~~)(\S(?:.*?\S)?)\1/g;
/**
 * Underscores only where a word does not run through them. GFM does not read
 * `snake_case_name` as emphasis, and neither does this.
 */
const UNDERSCORE_EMPHASIS =
  /(^|[\s([{"'])(_{1,3})(\S(?:.*?\S)?)\2(?=$|[\s).,!?\]}:;"'])/g;
const WHITESPACE = /\s+/g;

/**
 * One line of Markdown-free text, for reading rather than for rendering.
 *
 * The list that reopens a side chat shows the newest thing said in it under
 * the phrase it started from, and a second line of raw Markdown would tell two
 * similar side chats apart worse than plain words do.
 * `react-native-enriched-markdown` does not hand out the plain text it draws,
 * so the app makes this line itself; see the preserved evidence in
 * docs/decisions/mobile-side-chat.md.
 *
 * Only paired marks are taken away. Stripping single characters would reach
 * into the words themselves, and an answer about `owner_id` or `a => b` is
 * exactly the kind a person opens a side chat about.
 */
export function plainLine(markdown: string): string {
  return markdown
    .replace(FENCED_CODE, " ")
    .replace(INLINE_CODE, "$1")
    .replace(IMAGE, "$1")
    .replace(LINK, "$1")
    .replace(LINE_LEAD, "")
    .replace(EMPHASIS, "$2")
    .replace(EMPHASIS, "$2")
    .replace(UNDERSCORE_EMPHASIS, "$1$3")
    .replace(WHITESPACE, " ")
    .trim();
}
