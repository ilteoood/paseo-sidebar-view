import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const workspaceSorts = ["created", "lastPrompt", "name"] as const;
export const groupings = ["project", "status"] as const;
export const titleSources = ["title", "branch"] as const;
export const rowItems = ["branch", "host", "labels"] as const;
export const trailingItems = ["none", "diff", "timestamp"] as const;

export type WorkspaceSort = (typeof workspaceSorts)[number];
export type Grouping = (typeof groupings)[number];
export type TitleSource = (typeof titleSources)[number];
export type RowItem = (typeof rowItems)[number];
export type TrailingItem = (typeof trailingItems)[number];

export const workspaceSortLabels: Record<WorkspaceSort, string> = {
name: "Name",
  created: "Created",
  lastPrompt: "Last prompted",
};
export const groupingLabels: Record<Grouping, string> = { project: "Project", status: "Status" };
export const titleSourceLabels: Record<TitleSource, string> = { title: "Title", branch: "Branch" };
export const rowItemLabels: Record<RowItem, string> = {
  branch: "Branch",
  host: "Host",
  labels: "Labels",
};
export const trailingLabels: Record<TrailingItem, string> = {
  none: "None",
  diff: "Diff",
  timestamp: "Timestamp",
};

const rowItemsSchema = z.object({
  branch: z.boolean().default(true),
  host: z.boolean().default(false),
  labels: z.boolean().default(false),
});

export const preferencesSchema = z.object({
workspaceSort: z.enum(workspaceSorts).default("name"),
  grouping: z.enum(groupings).default("project"),
  titleSource: z.enum(titleSources).default("title"),
  rowItems: rowItemsSchema.prefault({}),
  trailing: z.enum(trailingItems).default("none"),
  hostFilters: z.array(z.string()).default([]),
  projectFilters: z.array(z.string()).default([]),
  showBackground: z.boolean().default(false),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const defaultPreferences: Preferences = preferencesSchema.parse({});

export const preferences = defineSettings({
  id: "sort",
  scope: "device",
  version: 1,
  schema: preferencesSchema,
});
