import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ComponentType } from "react";

export type AnyToolUIPart = DynamicToolUIPart | ToolUIPart;

export type ToolPartComponent = ComponentType<{ part: AnyToolUIPart }>;

/**
 * Where a product screen can hang a purpose-built view for one tool.
 *
 * The MVP registers nothing: every tool falls back to the safe default
 * status display. A future feature calls `registerToolRenderer` with the
 * tool's name, and only that tool changes its appearance.
 */
const renderers = new Map<string, ToolPartComponent>();

export function registerToolRenderer(
  toolName: string,
  component: ToolPartComponent
): void {
  renderers.set(toolName, component);
}

export function getToolRenderer(
  toolName: string
): ToolPartComponent | undefined {
  return renderers.get(toolName);
}

/** Tests register fake renderers; this puts the default state back. */
export function resetToolRenderers(): void {
  renderers.clear();
}
