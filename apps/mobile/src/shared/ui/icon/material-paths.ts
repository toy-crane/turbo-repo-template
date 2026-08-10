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
  /** content_copy */
  contentCopy:
    "M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z",
  /** edit */
  edit: "M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z",
  /** keyboard_arrow_down */
  keyboardArrowDown: "M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z",
  /** refresh */
  refresh:
    "M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z",
  /** stop (fill variant) */
  stop: "M240-240v-480h480v480H240Z",
} as const;

export type MaterialSymbolName = keyof typeof materialSymbolPaths;
