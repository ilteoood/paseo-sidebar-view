import type { PluginHostSummary, PluginSidebarViewProps } from "@getpaseo/plugin/client";
import {
  groupingLabels,
  groupings,
  rowItemLabels,
  rowItems,
  titleSourceLabels,
  titleSources,
  trailingLabels,
  workspaceSortLabels,
  workspaceSorts,
  type Grouping,
  type Preferences,
  type RowItem,
  type TitleSource,
} from "../shared/preferences.ts";
import { displayPageTitles, optionEntries } from "./menu-entries.ts";
import type { DisplayPage, MenuEntry } from "./menu-entries.ts";

type ProjectChoice = {
  readonly key: string;
  readonly title: string | null;
};

const groupingIcons: Record<Grouping, string> = { project: "Folder", status: "CircleDashed" };
const titleSourceIcons: Record<TitleSource, string> = { title: "Type", branch: "GitBranch" };
const rowItemIcons: Record<RowItem, string> = {
  branch: "GitBranch",
  project: "Folder",
  host: "Server",
  labels: "Tag",
};

function hostStatusColor(
  status: PluginHostSummary["status"],
  colors: PluginSidebarViewProps["theme"]["colors"],
): string {
  if (status === "online") return colors.statusSuccess;
  if (status === "connecting") return colors.statusWarning;
  if (status === "offline" || status === "error") return colors.statusDanger;
  return colors.foregroundMuted;
}

function toggledFilter(filters: readonly string[], value: string): string[] {
  return filters.includes(value)
    ? filters.filter((filter) => filter !== value)
    : [...filters, value];
}

export function displayPageEntries({
  page,
  values,
  ready,
  hosts,
  projects,
  colors,
  apply,
  retry,
  showPage,
}: {
  page: DisplayPage;
  values: Preferences;
  ready: boolean;
  hosts: readonly PluginHostSummary[];
  projects: readonly ProjectChoice[];
  colors: PluginSidebarViewProps["theme"]["colors"];
  apply: (patch: Partial<Preferences>) => void;
  retry: () => void;
  showPage: (page: DisplayPage) => void;
}): readonly MenuEntry[] {
  if (!ready) {
    return [{ label: "The display preferences could not be read", value: "Try again", onPress: retry }];
  }

  const pageEntry = (label: string, target: DisplayPage, value?: string): MenuEntry => ({
    label,
    value,
    chevron: true,
    keepOpen: true,
    onPress: () => showPage(target),
  });

  const entriesFor = (): readonly MenuEntry[] => {
    if (page === "grouping") {
      return optionEntries(
        groupings,
        groupingLabels,
        values.grouping,
        (option) => apply({ grouping: option }),
        groupingIcons,
      );
    }
    if (page === "sort") {
      return optionEntries(workspaceSorts, workspaceSortLabels, values.workspaceSort, (option) =>
        apply({ workspaceSort: option }),
      );
    }
    if (page === "title") {
      return optionEntries(
        titleSources,
        titleSourceLabels,
        values.titleSource,
        (option) => apply({ titleSource: option }),
        titleSourceIcons,
      );
    }
    if (page === "show") {
      return [
        ...rowItems.map((item) => ({
          icon: rowItemIcons[item],
          label: rowItemLabels[item],
          selected: values.rowItems[item],
          keepOpen: true,
          onPress: () =>
            apply({ rowItems: { ...values.rowItems, [item]: !values.rowItems[item] } }),
        })),
        {
          icon: "Diff",
          label: trailingLabels.diff,
          separatorBefore: true,
          selected: values.trailing === "diff",
          keepOpen: true,
          onPress: () => apply({ trailing: values.trailing === "diff" ? "none" : "diff" }),
        },
        {
          icon: "Clock",
          label: trailingLabels.timestamp,
          selected: values.trailing === "timestamp",
          keepOpen: true,
          onPress: () =>
            apply({ trailing: values.trailing === "timestamp" ? "none" : "timestamp" }),
        },
      ];
    }
    if (page === "host") {
      return [
        {
          label: "All hosts",
          selected: values.hostFilters.length === 0,
          keepOpen: true,
          onPress: () => apply({ hostFilters: [] }),
        },
        ...hosts.map((host) => ({
          label: host.label.trim() || host.serverId,
          leadingDot: hostStatusColor(host.status, colors),
          selected: values.hostFilters.includes(host.serverId),
          keepOpen: true,
          onPress: () => apply({ hostFilters: toggledFilter(values.hostFilters, host.serverId) }),
        })),
      ];
    }
    if (page === "project") {
      return [
        {
          label: "All projects",
          selected: values.projectFilters.length === 0,
          keepOpen: true,
          onPress: () => apply({ projectFilters: [] }),
        },
        ...projects.map((project) => ({
          label: project.title ?? project.key,
          selected: values.projectFilters.includes(project.key),
          keepOpen: true,
          onPress: () => apply({ projectFilters: toggledFilter(values.projectFilters, project.key) }),
        })),
      ];
    }
    return [
      pageEntry("Grouping", "grouping", groupingLabels[values.grouping]),
      pageEntry("Sort", "sort", workspaceSortLabels[values.workspaceSort]),
      pageEntry("Title", "title", titleSourceLabels[values.titleSource]),
      pageEntry("Show", "show"),
      ...(hosts.length > 1
        ? [
            {
              ...pageEntry("Host", "host"),
              dot: values.hostFilters.length > 0,
              separatorBefore: true,
            },
          ]
        : []),
      {
        ...pageEntry("Project", "project"),
        dot: values.projectFilters.length > 0,
        separatorBefore: hosts.length <= 1,
      },
      {
        label: "Show background",
        selected: values.showBackground,
        keepOpen: true,
        separatorBefore: true,
        onPress: () => apply({ showBackground: !values.showBackground }),
      },
    ];
  };

  const entries = entriesFor();
  if (page === "root") return entries;
  return [
    {
      icon: "ChevronLeft",
      label: displayPageTitles[page],
      keepOpen: true,
      onPress: () => showPage("root"),
    },
    ...entries,
  ];
}
