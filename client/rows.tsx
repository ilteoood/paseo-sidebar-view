import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { ViewInstance } from "react-native";
import type { WorkspaceIndicator } from "@getpaseo/plugin";
import {
  type PluginSidebarViewProps,
  type ProjectRef,
  type WorkspaceRef,
  usePaseo,
  useProject,
  useRpc,
  useWorkspace,
} from "@getpaseo/plugin/client";
import { Icon, Modal, copyText, useToast } from "@getpaseo/plugin/client/ui";
import { Spinner } from "./spinner.tsx";
import type { Preferences, TitleSource, TrailingItem } from "../shared/preferences.ts";
import { removeProjectRpc } from "../shared/project-removal.ts";
import { RemoveProjectDialog, RenameForm } from "./dialogs.tsx";
import type { ActionPressState, OpenMenu } from "./menu.tsx";
import type { MenuEntry } from "./menu-entries.ts";
import { removalMessage } from "./removal-message.ts";
import { formatRelativeTime } from "./relative-time.ts";
import { statusColor, statusIcon } from "./status-presentation.ts";
import {
  doneDotOpacity,
  filledDotSize,
  hoverTint,
  isTouchPlatform,
  leadingSlot,
  pressedTint,
  projectRow,
  runningIconSize,
sectionHeader,
  selectedTint,
  statusGroupHeader,
  statusHeaderLeading,
  statusIconSize,
  archiveAction,
  titleIdleOpacity,
  trailingHighlight,
  trailingHitBox,
  workspaceRow,
} from "./sidebar-styles.ts";
import { workspaceDisplayName } from "./workspace-sort.ts";

export type RowDisplay = {
  readonly titleSource: TitleSource;
  readonly rowItems: Preferences["rowItems"];
  readonly trailing: TrailingItem;
};

type MetaItem = {
  readonly key: string;
  readonly icon: string;
  readonly text: string;
};

function useFailureReporter() {
  const toast = useToast();
  return (failureMessage: string, action: () => unknown): void => {
    Promise.resolve()
      .then(action)
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : failureMessage);
      });
  };
}

function useRowChrome(menuAnchor: ViewInstance | null) {
  const rowRef = useRef<ViewInstance | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const menuOpen = rowRef.current !== null && menuAnchor === rowRef.current;
  return {
    rowRef,
    hovered,
    pressed,
    menuOpen,
    showsChrome: hovered || menuOpen || isTouchPlatform,
    setHovered,
    setPressed,
  };
}

export function TrailingAction({
  icon,
  iconSize,
  label,
  visible,
  view,
  onHoverChange,
  onPress,
}: {
  icon: string;
  iconSize: number;
  label: string;
  visible: boolean;
  view: PluginSidebarViewProps;
  onHoverChange: (hovered: boolean) => void;
  onPress: () => void;
}) {
  const { colors } = view.theme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
      onPress={onPress}
      pointerEvents={visible ? "auto" : "none"}
      style={{ ...trailingHitBox, cursor: "pointer", opacity: visible ? 1 : 0 }}
    >
      {({ hovered, pressed }: ActionPressState) => (
        <View
          style={{
            ...trailingHighlight,
            backgroundColor: hovered || pressed ? colors.surface2 : undefined,
          }}
        >
          <Icon name={icon} size={iconSize} color={colors.foregroundMuted} />
        </View>
      )}
    </Pressable>
  );
}

export function SectionHeader({
  title,
  view,
  children,
}: {
  title: string;
  view: PluginSidebarViewProps;
  children?: ReactNode;
}) {
  return (
    <View style={sectionHeader}>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{ fontSize: 12, flex: 1, color: view.theme.colors.foregroundMuted }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
export function StatusGroupHeader({
  title,
  color,
  leadingIconName,
  collapsed,
  count,
  view,
  onToggle,
}: {
  title: string;
  color: string;
  leadingIconName: string;
  collapsed: boolean;
  count: number;
  view: PluginSidebarViewProps;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${title}`}
      accessibilityState={{ expanded: !collapsed }}
      onPress={onToggle}
      style={{ padding: 0 }}
    >
      <View style={statusGroupHeader}>
        <Icon
          name={collapsed ? "ChevronRight" : "ChevronDown"}
          size={12}
          color={view.theme.colors.foregroundMuted}
        />
        <View style={statusHeaderLeading}>
{leadingIconName === "LoaderCircle" ? (
            <Spinner size={12} color={color} />
          ) : (
            <Icon name={leadingIconName} size={12} color={color} />
          )}
</View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 12,
            flex: 1,
            color: view.theme.colors.foregroundMuted,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {title}
        </Text>
        <Text style={{ fontSize: 11, color: view.theme.colors.foregroundMuted, opacity: 0.7 }}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

function StatusIndicator({
  indicator,
  view,
  iconSize = statusIconSize,
  spinnerSize = runningIconSize,
}: {
  indicator: WorkspaceIndicator;
  view: PluginSidebarViewProps;
  iconSize?: number;
  spinnerSize?: number;
}) {
  const { colors } = view.theme;
  if (indicator === "running") {
    return <Spinner size={spinnerSize} color={colors.statusWarning} />;
  }
  if (indicator === "done") {
    return (
      <View
        style={{
          width: filledDotSize,
          height: filledDotSize,
          borderRadius: filledDotSize / 2,
          backgroundColor: colors.foregroundMuted,
          opacity: doneDotOpacity,
        }}
      />
    );
  }
  return (
    <Icon name={statusIcon(indicator)} size={iconSize} color={statusColor(indicator, colors)} />
  );
}

function MetaLine({
  items,
  view,
}: {
  items: readonly MetaItem[];
  view: PluginSidebarViewProps;
}) {
  const { colors } = view.theme;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", minWidth: 0 }}>
      {items.map((item, index) => (
        <View
          key={item.key}
          style={{ flexDirection: "row", alignItems: "center", minWidth: 0, flexShrink: 1 }}
        >
          {index > 0 ? (
            <Text
              style={{
                marginHorizontal: 6,
                fontSize: 12,
                lineHeight: 16,
                color: colors.foregroundMuted,
              }}
            >
              {"\u00b7"}
            </Text>
          ) : null}
          <Icon name={item.icon} size={12} color={colors.foregroundMuted} />
          <Text
            numberOfLines={1}
            style={{
              marginLeft: 3,
              fontSize: 12,
              lineHeight: 16,
              flexShrink: 1,
              color: colors.foregroundMuted,
            }}
          >
            {item.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function WorkspaceRow({
  reference,
  indented,
  display,
  hostLabels,
  view,
  now,
  onOpenActions,
  menuAnchor,
}: {
  reference: WorkspaceRef;
  indented?: boolean;
  display: RowDisplay;
  hostLabels: ReadonlyMap<string, string>;
  view: PluginSidebarViewProps;
  now: number;
  onOpenActions: OpenMenu;
  menuAnchor: ViewInstance | null;
}) {
  const workspace = useWorkspace(reference);
  const paseo = usePaseo();
  const toast = useToast();
  const reportFailure = useFailureReporter();
  const chrome = useRowChrome(menuAnchor);
  const [renaming, setRenaming] = useState(false);
  const active = view.active.workspace?.key === reference.key;
  if (!workspace) return null;

  const { titleSource, rowItems, trailing } = display;
  const label = workspaceDisplayName(workspace, titleSource);
  const customName = workspace.title ?? workspace.name;
  const branch = workspace.branch;
  const pinned = workspace.pinnedAt !== null;
  const hostLabel = hostLabels.get(workspace.hostId) ?? workspace.hostId;
  const metaItems: readonly MetaItem[] = [
    ...(rowItems.branch && branch ? [{ key: "branch", icon: "GitBranch", text: branch }] : []),
    ...(rowItems.project
      ? [{ key: "project", icon: "Folder", text: workspace.projectDisplayName }]
      : []),
    ...(rowItems.host ? [{ key: "host", icon: "Server", text: hostLabel }] : []),
    ...(rowItems.labels && workspace.labels.length > 0
      ? [{ key: "labels", icon: "Tag", text: workspace.labels.join(", ") }]
      : []),
  ];
  const trailingText =
    trailing === "diff" && workspace.diffStat
      ? `+${workspace.diffStat.additions} \u2212${workspace.diffStat.deletions}`
      : trailing === "timestamp"
        ? formatRelativeTime(workspace.lastPromptAt ?? workspace.createdAt, now)
        : null;
  const workspaceActions = () => paseo.workspaces.ref(reference);
  const submitRename = (draft: string) => {
    const name = draft.trim();
    setRenaming(false);
    if (name !== customName) {
      reportFailure("Could not rename the workspace", () => workspaceActions().setTitle(name || null));
    }
  };
  const entries: readonly MenuEntry[] = [
    {
      icon: "Plus",
      label: "New workspace",
      onPress: () =>
        reportFailure("Could not open the new workspace screen", () =>
          paseo.projects.ref(workspace.project).open(),
        ),
    },
    {
      icon: "Copy",
      label: "Copy path",
      onPress: () =>
        reportFailure("Could not copy the path", async () => {
          await copyText(workspace.directory);
          toast.show("Path copied", { variant: "success" });
        }),
    },
    ...(branch
      ? [
          {
            icon: "GitBranch",
            label: "Copy branch name",
            onPress: () =>
              reportFailure("Could not copy the branch name", async () => {
                await copyText(branch);
                toast.show("Branch name copied", { variant: "success" });
              }),
          },
        ]
      : []),
    { icon: "Pencil", label: "Rename workspace", onPress: () => setRenaming(true) },
    {
      icon: pinned ? "PinOff" : "Pin",
      label: pinned ? "Unpin" : "Pin to top",
      onPress: () =>
        reportFailure("Could not update the pin", () => workspaceActions().setPinned(!pinned)),
    },
    {
      icon: "Archive",
      label: "Archive",
      onPress: () =>
        reportFailure("Could not archive the workspace", () => workspaceActions().archive()),
    },
  ];

  return (
    <>
      <View
        ref={chrome.rowRef}
        onPointerEnter={() => chrome.setHovered(true)}
        onPointerLeave={() => chrome.setHovered(false)}
        style={{
          ...workspaceRow,
          paddingLeft: indented ? 16 : 8,
          backgroundColor: chrome.pressed
            ? pressedTint
            : active
              ? selectedTint
              : chrome.hovered || chrome.menuOpen
                ? hoverTint
                : undefined,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${label}`}
          accessibilityState={{ selected: active }}
          onPressIn={() => chrome.setPressed(true)}
          onPressOut={() => chrome.setPressed(false)}
          onPress={() => view.navigation.openWorkspace(reference)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <View style={leadingSlot}>
            <StatusIndicator indicator={workspace.indicator} view={view} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 14,
                lineHeight: 20,
                flexShrink: 1,
                color: view.theme.colors.foreground,
                opacity: chrome.hovered || active || chrome.menuOpen ? 1 : titleIdleOpacity,
              }}
            >
              {label}
            </Text>
            {metaItems.length > 0 ? <MetaLine items={metaItems} view={view} /> : null}
          </View>
        </Pressable>
        {trailingText ? (
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, marginRight: 4, color: view.theme.colors.foregroundMuted }}
          >
            {trailingText}
          </Text>
        ) : null}
<Pressable
            accessibilityRole="button"
            accessibilityLabel={`Archive ${label}`}
            accessibilityState={{ disabled: workspace.archivingAt !== null }}
            disabled={workspace.archivingAt !== null}
            onHoverIn={() => chrome.setHovered(true)}
            onHoverOut={() => chrome.setHovered(false)}
            onFocus={() => chrome.setHovered(true)}
            onBlur={() => chrome.setHovered(false)}
            onPress={() =>
              reportFailure("Could not archive the workspace", () => workspaceActions().archive())
            }
            pointerEvents={chrome.showsChrome ? "auto" : "none"}
            style={{
              ...archiveAction,
              marginLeft: !isTouchPlatform && !chrome.showsChrome ? -(archiveAction.width + archiveAction.marginRight) : 0,
              opacity: workspace.archivingAt !== null ? 0.5 : chrome.showsChrome ? 1 : 0,
              cursor: "pointer",
            }}
          >
            {({ hovered: h, pressed: p }: ActionPressState) => (
              <View
                style={{
                  ...trailingHighlight,
                  backgroundColor: h || p ? view.theme.colors.surface2 : undefined,
                }}
              >
                <Icon
                  name={workspace.archivingAt !== null ? "LoaderCircle" : "Archive"}
                  size={14}
                  color={view.theme.colors.foregroundMuted}
                />
              </View>
            )}
          </Pressable>
        <TrailingAction
          icon="EllipsisVertical"
          iconSize={16}
          label={`Actions for ${label}`}
          visible={chrome.showsChrome}
          view={view}
          onHoverChange={chrome.setHovered}
          onPress={() => onOpenActions(chrome.rowRef.current, entries)}
        />
      </View>
      {renaming ? (
        <Modal
          title="Rename workspace"
          open
          onOpenChange={(open) => {
            if (!open) setRenaming(false);
          }}
        >
          <RenameForm
            initialName={customName}
            view={view}
            onCancel={() => setRenaming(false)}
            onSubmit={submitRename}
          />
        </Modal>
      ) : null}
    </>
  );
}

type BrowserWindow = {
  readonly history: { pushState(data: unknown, unused: string, url: string): void };
  readonly dispatchEvent: (event: unknown) => boolean;
  readonly PopStateEvent: new (type: string) => unknown;
};

// shortcut: the plugin API has no route to the app's settings, so this drives the app router through the browser history react-navigation listens on; native returns false.
function openProjectSettings(reference: ProjectRef): boolean {
  const browser = (globalThis as { window?: BrowserWindow }).window;
  if (typeof browser?.history?.pushState !== "function") return false;
  if (typeof browser.PopStateEvent !== "function") return false;
  const hostId = encodeURIComponent(reference.hostId);
  const projectId = encodeURIComponent(reference.id);
  try {
    browser.history.pushState(null, "", `/settings/hosts/${hostId}/projects/${projectId}`);
    browser.dispatchEvent(new browser.PopStateEvent("popstate"));
    return true;
  } catch {
    return false;
  }
}

export function ProjectHeaderRow({
  reference,
  view,
  collapsed,
  onToggleCollapsed,
  onOpenActions,
  meta,
  menuAnchor,
}: {
  reference: ProjectRef;
  view: PluginSidebarViewProps;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenActions: OpenMenu;
  menuAnchor: ViewInstance | null;
meta?: { readonly isArchiving: boolean; readonly statusBucket: WorkspaceIndicator | null } | null;
}) {
  const project = useProject(reference);
  const paseo = usePaseo();
  const toast = useToast();
  const removeProject = useRpc(removeProjectRpc);
  const reportFailure = useFailureReporter();
  const chrome = useRowChrome(menuAnchor);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  if (!project) return null;

  const confirmRemoval = () => {
    setConfirmingRemoval(false);
    reportFailure("Could not remove the project", async () => {
      const { removedWorkspaceCount } = await removeProject({ projectId: reference.id });
      toast.show(removalMessage(removedWorkspaceCount), { variant: "success" });
    });
  };
  const entries: readonly MenuEntry[] = [
    {
      icon: "Settings",
      label: "Open project settings",
      onPress: () => {
        if (!openProjectSettings(reference)) {
          toast.error("Project settings open in the desktop app only");
        }
      },
    },
    { icon: "Trash2", label: "Remove project", onPress: () => setConfirmingRemoval(true) },
  ];

  return (
    <>
      <View
        ref={chrome.rowRef}
        onPointerEnter={() => chrome.setHovered(true)}
        onPointerLeave={() => chrome.setHovered(false)}
        style={{
          ...projectRow,
          backgroundColor: chrome.pressed
            ? pressedTint
            : chrome.hovered || chrome.menuOpen
              ? hoverTint
              : undefined,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${project.displayName}`}
          accessibilityState={{ expanded: !collapsed }}
          onPressIn={() => chrome.setPressed(true)}
          onPressOut={() => chrome.setPressed(false)}
          onPress={onToggleCollapsed}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <View style={leadingSlot}>
{meta?.isArchiving ? (
              <Spinner size={16} color={view.theme.colors.foregroundMuted} />
            ) : meta?.statusBucket && meta.statusBucket !== "done" ? (
              <StatusIndicator
                indicator={meta.statusBucket}
                view={view}
                iconSize={16}
                spinnerSize={16}
              />
            ) : chrome.showsChrome ? (
              <Icon
                name={collapsed ? "ChevronRight" : "ChevronDown"}
                size={14}
                color={view.theme.colors.foregroundMuted}
              />
            ) : (
              <Icon name="Folder" size={16} color={view.theme.colors.foregroundMuted} />
            )}
          </View>
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, flex: 1, color: view.theme.colors.foregroundMuted }}
          >
            {project.displayName}
          </Text>
        </Pressable>
        <TrailingAction
          icon="Plus"
          iconSize={15}
          label={`New workspace in ${project.displayName}`}
          visible={chrome.showsChrome}
          view={view}
          onHoverChange={chrome.setHovered}
          onPress={() =>
            reportFailure("Could not open the new workspace screen", () =>
              paseo.projects.ref(reference).open(),
            )
          }
        />
        <TrailingAction
          icon="EllipsisVertical"
          iconSize={16}
          label={`Actions for ${project.displayName}`}
          visible={chrome.showsChrome}
          view={view}
          onHoverChange={chrome.setHovered}
          onPress={() => onOpenActions(chrome.rowRef.current, entries)}
        />
      </View>
      {confirmingRemoval ? (
        <Modal
          title="Remove project?"
          open
          onOpenChange={(open) => {
            if (!open) setConfirmingRemoval(false);
          }}
        >
          <RemoveProjectDialog
            projectName={project.displayName}
            view={view}
            onCancel={() => setConfirmingRemoval(false)}
            onConfirm={confirmRemoval}
          />
        </Modal>
      ) : null}
    </>
  );
}

