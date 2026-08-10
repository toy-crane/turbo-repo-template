/**
 * Material Symbols path data for the icons this app actually uses.
 *
 * Source: Google Material Symbols (outlined, 24px optical size),
 * https://github.com/google/material-design-icons — © Google LLC,
 * licensed under the Apache License, Version 2.0,
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Every path is drawn on the family's `0 -960 960 960` viewBox. Keeping the
 * data as a TypeScript record avoids `.svg` assets and a Metro transformer;
 * add an entry here only when a screen starts using the icon.
 */
export const MATERIAL_SYMBOL_VIEW_BOX = "0 -960 960 960";

export const materialSymbolPaths = {
  /** arrow_upward */
  arrowUpward:
    "M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z",
  /** keyboard_arrow_down */
  keyboardArrowDown: "M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z",
  /** stop (fill variant) */
  stop: "M240-240v-480h480v480H240Z",
} as const;

export type MaterialSymbolName = keyof typeof materialSymbolPaths;
