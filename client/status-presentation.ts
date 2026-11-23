import type { WorkspaceIndicator } from "@getpaseo/plugin";
import type { PluginSidebarViewProps } from "@getpaseo/plugin/client";

const statusIcons: Record<WorkspaceIndicator, string> = {
  needs_input: "CircleAlert",
  failed: "CircleX",
  running: "LoaderCircle",
  attention: "CircleCheck",
  done: "CircleDashed",
};

export function statusIcon(indicator: WorkspaceIndicator): string {
  return statusIcons[indicator];
}

export function statusColor(
  indicator: WorkspaceIndicator,
  colors: PluginSidebarViewProps["theme"]["colors"],
): string {
  if (indicator === "failed") return colors.statusDanger;
  if (indicator === "attention") return colors.statusSuccess;
  if (indicator === "needs_input" || indicator === "running") return colors.statusWarning;
  return colors.foregroundMuted;
}
