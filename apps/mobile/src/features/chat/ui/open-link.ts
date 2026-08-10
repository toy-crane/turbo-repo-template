import { openBrowserAsync } from "expo-web-browser";

/**
 * Opens a link in the in-app browser sheet.
 *
 * The sheet only understands web addresses; anything else is quietly ignored
 * rather than crashing the message that carried it.
 */
export function openExternalLink(url: string): void {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    openBrowserAsync(url).catch(() => undefined);
  }
}
