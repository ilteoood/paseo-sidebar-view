import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import type { ViewInstance } from "react-native";
import type { PluginWorkspaceSnapshot, WorkspaceIndicator } from "@getpaseo/plugin";
import {
  type PluginSidebarViewProps,
  type ProjectRef,
  type WorkspaceRef,
  useHosts,
  useProjects,
  useWorkspaces,
} from "@getpaseo/plugin/client";
import { FlatList, Icon } from "@getpaseo/plugin/client/ui";
import { displayPageEntries } from "./display-pages.ts";
import {
  type ActionPressState,
  FloatingMenu,
  type MenuAnchor,
  type OpenMenu,
  menuCardHeight,
} from "./menu.tsx";
import type { DisplayPage, MenuEntry } from "./menu-entries.ts";
import { type Rect, menuInset, menuPlacement } from "./menu-placement.ts";
import { usePreferencesDraft } from "./preferences-draft.ts";
import {
  ProjectHeaderRow,
  type RowDisplay,
  SectionHeader,
  StatusGroupHeader,
  WorkspaceRow,
} from "./rows.tsx";
import {
  displayTrigger,
  emptyCard,
  emptyNotice,
  emptyNoticeCard,
  groupSpacing,
  hoverTint,
  listPadding,
  menuRowMinHeight,
} from "./sidebar-styles.ts";
import { statusColor, statusIcon } from "./status-presentation.ts";
import { useNow } from "./use-now.ts";
import { projectsInGroupRank, workspaceComparator } from "./workspace-sort.ts";

type StatusBucket = WorkspaceIndicator;

type SidebarRow =
  | { readonly kind: "pinned-header"; readonly key: string }
  | { readonly kind: "workspaces-header"; readonly key: string }
  | {
      readonly kind: "status-header";
      readonly key: string;
      readonly title: string;
      readonly collapsed: boolean;
      readonly color: string;
      readonly iconName: string;
      readonly count: number;
      readonly endsGroup: boolean;
    }
  | { readonly kind: "empty"; readonly key: string }
  | {
      readonly kind: "workspace";
      readonly key: string;
      readonly reference: WorkspaceRef;
      readonly indented: boolean;
      readonly endsGroup: boolean;
    }
  | {
      readonly kind: "project";
      readonly key: string;
      readonly reference: ProjectRef;
      readonly collapsed: boolean;
      readonly endsGroup: boolean;
      readonly count: number;
    };

type MenuRequest =
  | ({ readonly kind: "actions"; readonly entries: readonly MenuEntry[] } & MenuAnchor)
  | ({ readonly kind: "display"; readonly page: DisplayPage } & MenuAnchor);

type DismissEvent = { readonly target?: unknown; readonly key?: string };
type PointerDocument = {
  addEventListener: (type: string, listener: (event: DismissEvent) => void) => void;
  removeEventListener: (type: string, listener: (event: DismissEvent) => void) => void;
};

const statusBuckets: readonly StatusBucket[] = [
  "needs_input",
  "failed",
  "running",
  "attention",
  "done",
];
function statusRank(bucket: string): number {
  const index = statusBuckets.indexOf(bucket as StatusBucket);
  return index === -1 ? statusBuckets.length : index;
}

function measureInWindow(node: ViewInstance, receive: (rect: Rect) => void) {
  node.measureInWindow((left, top, width, height) => receive({ left, top, width, height }));
}

function skeletonRow(): ReactElement {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", gap: 8 }}>
      <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "rgba(127, 127, 127, 0.18)" }} />
      <View style={{ flex: 1, height: 14, borderRadius: 4, backgroundColor: "rgba(127, 127, 127, 0.18)" }} />
    </View>
  );
}

function skeletonList(): readonly ReactElement[] {
  return Array.from({ length: 8 }, (_, index) => (
    <View key={`skeleton-${index}`}>{skeletonRow()}</View>
  ));
}

export function SortedSidebar(view: PluginSidebarViewProps) {
  const draft = usePreferencesDraft();
  const values = draft.values;
  const now = useNow(values.trailing === "timestamp" ? 60_000 : null);
  const hosts = useHosts();
  const hostLabels = new Map(hosts.map((host) => [host.serverId, host.label]));
  const rootRef = useRef<ViewInstance | null>(null);
  const displayTriggerRef = useRef<ViewInstance | null>(null);
  const [menu, setMenu] = useState<MenuRequest | null>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<readonly string[]>([]);
  const [collapsedStatusGroups, setCollapsedStatusGroups] = useState<readonly string[]>([]);

  const allProjects = useProjects({ orderBy: "displayName" });
const projectGroups = useWorkspaces({
groupBy: (workspace) => ({
    key: `${workspace.project.key}|${workspace.archivingAt !== null ? "A" : "I"}|${workspace.indicator}`,
  }),
});
const projectMeta = useMemo(() => {
  const map = new Map<string, { isArchiving: boolean; statusBucket: StatusBucket | null }>();
  for (const group of projectGroups) {
    const [projectKey, archiveMark, bucket] = group.key.split("|") as [string, "A" | "I", StatusBucket];
    const current = map.get(projectKey) ?? { isArchiving: false, statusBucket: null };
    if (archiveMark === "A") current.isArchiving = true;
    if (current.statusBucket === null || statusRank(bucket) < statusRank(current.statusBucket)) {
      current.statusBucket = bucket;
    }
    map.set(projectKey, current);
  }
  return map;
}, [projectGroups]);
  const orderBy = workspaceComparator(values.workspaceSort, values.titleSource);

  const matchesFilters = useMemo(
    () => (workspace: PluginWorkspaceSnapshot): boolean => {
      const hostOk = values.hostFilters.length === 0 || values.hostFilters.includes(workspace.hostId);
      const projectOk =
        values.projectFilters.length === 0 ||
        values.projectFilters.includes(workspace.project.key);
      const backgroundOk = values.showBackground ? true : !workspace.background;
      return hostOk && projectOk && backgroundOk;
    },
    [values.hostFilters, values.projectFilters, values.showBackground],
  );

  const pinnedRefs = useWorkspaces({
    where: (workspace) => workspace.pinnedAt !== null && matchesFilters(workspace),
    orderBy,
  });
  const statusGroups =
    values.grouping === "status"
      ? useWorkspaces({
          where: matchesFilters,
          orderBy,
          groupBy: (workspace) => ({
            key: workspace.indicator,
            title: workspace.indicatorLabel ?? workspace.indicator,
            color: statusColor(workspace.indicator, view.theme.colors),
          }),
        })
      : useWorkspaces({
          where: matchesFilters,
          orderBy,
          groupBy: (workspace) => ({
            key: workspace.project.key,
            title: workspace.projectDisplayName,
          }),
        });

  const statusOrdered = useMemo(
    () =>
      values.grouping === "status"
        ? [...statusGroups].sort((left, right) => statusRank(left.key) - statusRank(right.key))
        : null,
    [statusGroups, values.grouping],
  );
  const projectByKey = useMemo(() => {
    if (values.grouping !== "project") return null;
    const groupedKeys = statusGroups.map((group) => group.key);
    if (values.workspaceSort === "name") {
      return allProjects.filter((project) => groupedKeys.includes(project.key));
    }
    return projectsInGroupRank(allProjects, groupedKeys);
  }, [allProjects, statusGroups, values.grouping, values.workspaceSort]);

  const display: RowDisplay = {
    titleSource: values.titleSource,
    rowItems: values.rowItems,
    trailing: values.trailing,
  };

  const toggleCollapsed = (key: string) =>
    setCollapsedProjects((current) =>
      current.includes(key) ? current.filter((other) => other !== key) : [...current, key],
    );
  const toggleStatusCollapsed = (key: string) =>
    setCollapsedStatusGroups((current) =>
      current.includes(key) ? current.filter((other) => other !== key) : [...current, key],
    );
  const clearFilters = () => draft.apply({ hostFilters: [], projectFilters: [] });

  const showPage = (page: DisplayPage) =>
    setMenu((current) => (current && current.kind === "display" ? { ...current, page } : current));

  const anchorMenu = (node: ViewInstance | null, build: (anchor: MenuAnchor) => MenuRequest) => {
    const root = rootRef.current;
    if (!root) return;
    measureInWindow(root, (rootRect) => {
      const place = (anchor: Rect) => setMenu(build({ node, root: rootRect, anchor }));
      if (!node) {
        place({ left: rootRect.left + rootRect.width, top: rootRect.top + menuInset, width: 0, height: 0 });
        return;
      }
      measureInWindow(node, place);
    });
  };
  const openMenu: OpenMenu = (node, entries) =>
    anchorMenu(node, (anchor) => ({ kind: "actions", entries, ...anchor }));
  const openDisplayMenu = (node: ViewInstance | null) =>
    anchorMenu(node, (anchor) => ({ kind: "display", page: "root", ...anchor }));

  useEffect(() => {
    if (!menu) return;
    const pointerDocument = (globalThis as { document?: PointerDocument }).document;
    if (!pointerDocument) return;
    const dismissOutsideSidebar = (event: DismissEvent) => {
      const root = rootRef.current as unknown as { contains?: (node: unknown) => boolean } | null;
      if (!root || typeof root.contains !== "function") return;
      if (root.contains(event.target)) return;
      setMenu(null);
    };
    const dismissOnEscape = (event: DismissEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    pointerDocument.addEventListener("pointerdown", dismissOutsideSidebar);
    pointerDocument.addEventListener("keydown", dismissOnEscape);
    return () => {
      pointerDocument.removeEventListener("pointerdown", dismissOutsideSidebar);
      pointerDocument.removeEventListener("keydown", dismissOnEscape);
    };
  }, [menu]);

  const filtersActive = values.hostFilters.length > 0 || values.projectFilters.length > 0;
  const isEmpty =
    pinnedRefs.length === 0 &&
    (values.grouping === "status"
      ? statusOrdered?.length === 0
      : projectByKey?.length === 0);

  const rows: SidebarRow[] = [];
  if (pinnedRefs.length > 0) {
    rows.push({ kind: "pinned-header", key: "pinned-header" });
    pinnedRefs.forEach((reference, index) => {
      rows.push({
        kind: "workspace",
        key: `pinned:${reference.key}`,
        reference,
        indented: false,
        endsGroup: index === pinnedRefs.length - 1,
      });
    });
  }
  rows.push({ kind: "workspaces-header", key: "workspaces-header" });
  if (isEmpty) {
    rows.push({ kind: "empty", key: "empty" });
  } else if (values.grouping === "status" && statusOrdered) {
    statusOrdered.forEach((group, groupIndex) => {
      const bucket = group.key as StatusBucket;
      const collapsed = collapsedStatusGroups.includes(bucket);
      const lastGroup = groupIndex === statusOrdered.length - 1;
      rows.push({
        kind: "status-header",
        key: `status:${bucket}`,
        title: group.title ?? bucket,
        collapsed,
        color: group.color ?? view.theme.colors.foregroundMuted,
        iconName: statusIcon(bucket),
        count: group.items.length,
        endsGroup: lastGroup,
      });
      if (collapsed) return;
      group.items.forEach((reference, index) => {
        rows.push({
          kind: "workspace",
          key: `status:${bucket}:${reference.key}`,
          reference,
          indented: false,
          endsGroup: lastGroup && index === group.items.length - 1,
        });
      });
    });
  } else if (values.grouping === "project" && projectByKey) {
    const groupByKey = new Map(statusGroups.map((group) => [group.key, group]));
    projectByKey.forEach((reference, projectIndex) => {
      const group = groupByKey.get(reference.key);
      const collapsed = collapsedProjects.includes(reference.key);
      const lastProject = projectIndex === projectByKey.length - 1;
      rows.push({
        kind: "project",
        key: `project:${reference.key}`,
        reference,
        collapsed,
        endsGroup: collapsed || !group,
        count: group?.items.length ?? 0,
      });
      if (collapsed || !group) return;
      group.items.forEach((childReference, index) => {
        rows.push({
          kind: "workspace",
          key: `project:${reference.key}:${childReference.key}`,
          reference: childReference,
          indented: true,
          endsGroup: lastProject && index === group.items.length - 1,
        });
      });
    });
  }

  const shownProjects = projectByKey ?? [];
  const menuEntries: readonly MenuEntry[] =
    menu === null
      ? []
      : menu.kind === "actions"
        ? menu.entries
        : displayPageEntries({
            page: menu.page,
            values,
            ready: draft.status === "ready",
            hosts,
            projects: shownProjects.map((reference) => ({ key: reference.key, title: reference.id })),
            colors: view.theme.colors,
            apply: draft.apply,
            retry: draft.retry,
            showPage,
          });
  const menuPlacementResult =
    menu === null
      ? null
      : menuPlacement(
          menu.root,
          menu.anchor,
          Math.min(menuCardHeight(menuEntries), Math.max(0, menu.root.height - menuInset * 2)),
        );
  const menuMaxHeight =
    menu === null || menuPlacementResult === null
      ? 0
      : Math.max(menuRowMinHeight, menu.root.height - menuPlacementResult.top - menuInset);

  const renderRow = ({ item }: { readonly item: SidebarRow }): ReactElement => {
    switch (item.kind) {
      case "pinned-header":
        return <SectionHeader title="Pinned" view={view} />;
      case "workspaces-header":
        return (
          <SectionHeader title={values.grouping === "status" ? "Workspaces by status" : "Workspaces"} view={view}>
            <Pressable
              ref={displayTriggerRef}
              accessibilityRole="button"
              accessibilityLabel="Display preferences"
              onPress={() => openDisplayMenu(displayTriggerRef.current)}
              style={({ hovered }: ActionPressState) => ({
                ...displayTrigger,
                cursor: "pointer",
                backgroundColor: hovered ? hoverTint : undefined,
              })}
            >
              <Icon name="Settings2" size={14} color={view.theme.colors.foregroundMuted} />
            </Pressable>
          </SectionHeader>
        );
      case "status-header":
        return (
          <View style={item.endsGroup ? groupSpacing : undefined}>
            <StatusGroupHeader
              title={item.title}
              color={item.color}
              leadingIconName={item.iconName}
              collapsed={item.collapsed}
              count={item.count}
              view={view}
              onToggle={() => toggleStatusCollapsed(item.key.replace(/^status:/, ""))}
            />
          </View>
        );
      case "empty":
        return (
          <View style={emptyCard}>
            <Text style={{ ...emptyNoticeCard, color: view.theme.colors.foreground }}>
              {filtersActive ? "No workspaces match the filters." : "No workspaces."}
            </Text>
            <Text
              style={{
                ...emptyNotice,
                fontSize: 12,
                marginTop: 4,
                color: view.theme.colors.foregroundMuted,
              }}
            >
              {filtersActive
                ? "Adjust the host or project filter above, or clear them to see every workspace."
                : "Open a project to start a workspace."}
            </Text>
            {filtersActive ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
                onPress={clearFilters}
                style={({ hovered }: ActionPressState) => ({
                  marginTop: 12,
                  alignSelf: "flex-start",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: view.theme.colors.border,
                  backgroundColor: hovered ? view.theme.colors.surface2 : "transparent",
                  cursor: "pointer",
                })}
              >
                <Text style={{ fontSize: 12, color: view.theme.colors.foreground }}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        );
      case "project":
        return (
          <View style={item.endsGroup ? groupSpacing : undefined}>
            <ProjectHeaderRow
              reference={item.reference}
              view={view}
              collapsed={item.collapsed}
              onToggleCollapsed={() => toggleCollapsed(item.reference.key)}
              onOpenActions={openMenu}
              menuAnchor={menu?.node ?? null}
              meta={projectMeta.get(item.reference.key) ?? null}
            />
          </View>
        );
      case "workspace":
        return (
          <View style={item.endsGroup ? groupSpacing : undefined}>
            <WorkspaceRow
              reference={item.reference}
              indented={item.indented}
              display={display}
              hostLabels={hostLabels}
              view={view}
              now={now}
              onOpenActions={openMenu}
              menuAnchor={menu?.node ?? null}
            />
          </View>
        );
    }
  };

  return (
    <View
      ref={rootRef}
      collapsable={false}
      onLayout={() => {
        const root = rootRef.current;
        if (!root || !menu) return;
        measureInWindow(root, (rootRect) => {
          const { node } = menu;
          if (!node) {
            setMenu((current) => (current ? { ...current, root: rootRect } : current));
            return;
          }
          measureInWindow(node, (anchor) =>
            setMenu((current) => (current ? { ...current, root: rootRect, anchor } : current)),
          );
        });
      }}
      style={{ flex: 1 }}
    >
      {draft.status !== "ready" && draft.status !== "invalid" ? (
        <View style={{ paddingTop: 2 }}>{skeletonList()}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item: SidebarRow) => item.key}
          renderItem={renderRow}
          contentContainerStyle={listPadding}
          onScroll={() => setMenu(null)}
          scrollEventThrottle={16}
        />
      )}
      {menu && menuPlacementResult ? (
        <FloatingMenu
          entries={menuEntries}
          placement={menuPlacementResult}
          maxHeight={menuMaxHeight}
          page={menu.kind === "display" ? menu.page : ""}
          view={view}
          onDismiss={() => setMenu(null)}
        />
      ) : null}
    </View>
  );
}
