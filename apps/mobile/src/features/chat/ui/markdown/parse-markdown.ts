import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmTable } from "micromark-extension-gfm-table";

/**
 * Parses one message's Markdown into an mdast tree.
 *
 * Streaming hands this function unfinished syntax on purpose — an open code
 * fence, half a table row. The parser treats those as ordinary constructs
 * that end at the end of input, and if it ever does throw, the fallback keeps
 * the raw text on screen instead of taking the message down.
 */
export function parseMarkdown(text: string): Root {
  try {
    return fromMarkdown(text, {
      extensions: [gfmTable()],
      mdastExtensions: [gfmTableFromMarkdown()],
    });
  } catch {
    return {
      children: [
        {
          children: [{ type: "text", value: text }],
          type: "paragraph",
        },
      ],
      type: "root",
    };
  }
}
