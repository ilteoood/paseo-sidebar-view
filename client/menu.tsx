import { Pressable, Text, View } from "react-native";
import type { PressableStateCallbackType, ViewInstance } from "react-native";
import type { PluginSidebarViewProps } from "@getpaseo/plugin/client";
import { Icon, ScrollView } from "@getpaseo/plugin/client/ui";
import {
  filledDotSize,
  menuBorderWidth,
  menuIconSize,
  menuPagePadding,
  menuRow,
  menuRowMinHeight,
  menuSeparatorHeight,
} from "./sidebar-styles.ts";
import type { MenuPlacement } from "./menu-placement.ts";
import type { MenuEntry } from "./menu-entries.ts";

export type ActionPressState = PressableStateCallbackType & { readonly hovered?: boolean };


export type MenuAnchor = {
  readonly node: ViewInstance | null;
  readonly root: { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
  readonly anchor: { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
};

export type OpenMenu = (node: ViewInstance | null, entries: readonly MenuEntry[]) => void;

export function menuCardHeight(entries: readonly MenuEntry[]): number {
  const rows = entries.reduce(
    (total, entry) => total + menuRowMinHeight + (entry.separatorBefore ? menuSeparatorHeight : 0),
    0,
  );
  return rows + menuPagePadding * 2 + menuBorderWidth * 2;
}


export function FloatingMenu({
  entries,
  placement,
  maxHeight,
  page,
  view,
  onDismiss,
}: {
  entries: readonly MenuEntry[];
  placement: MenuPlacement;
  maxHeight: number;
  page: string;
  view: PluginSidebarViewProps;
  onDismiss: () => void;
}) {
  const { colors } = view.theme;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close the menu"
        onPress={onDismiss}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
      />
      <View
        accessibilityRole="menu"
        accessibilityViewIsModal
        style={{
          position: "absolute",
          zIndex: 11,
          top: placement.top,
          left: placement.left,
          width: placement.width,
          maxHeight,
          borderWidth: menuBorderWidth,
          borderRadius: 8,
          borderColor: colors.border,
          backgroundColor: colors.surface1,
          shadowColor: "rgba(0, 0, 0, 0.20)",
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <ScrollView
          key={page}
          style={{ borderRadius: 8, overflow: "hidden" }}
          contentContainerStyle={{ paddingVertical: menuPagePadding }}
        >
          {entries.map((entry, index) => (
            <View key={`${index}-${entry.label}`}>
              {entry.separatorBefore ? (
                <View
                  style={{
                    height: 1,
                    marginHorizontal: 4,
                    marginVertical: 4,
                    backgroundColor: colors.border,
                  }}
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={
                  entry.selected === undefined ? undefined : { selected: entry.selected }
                }
                onPress={() => {
                  if (!entry.keepOpen) onDismiss();
                  entry.onPress();
                }}
                style={({ hovered, pressed }: ActionPressState) => ({
                  ...menuRow,
                  cursor: "pointer",
                  backgroundColor: hovered || pressed ? colors.surface2 : undefined,
                })}
              >
                {entry.leadingDot ? (
                  <View style={{ width: menuIconSize, alignItems: "center" }}>
                    <View
                      style={{
                        width: filledDotSize,
                        height: filledDotSize,
                        borderRadius: filledDotSize / 2,
                        backgroundColor: entry.leadingDot,
                      }}
                    />
                  </View>
                ) : null}
                {entry.icon ? (
                  <Icon name={entry.icon} size={menuIconSize} color={colors.foregroundMuted} />
                ) : null}
                <Text numberOfLines={1} style={{ fontSize: 14, flex: 1, color: colors.foreground }}>
                  {entry.label}
                </Text>
                {entry.value ? (
                  <Text numberOfLines={1} style={{ fontSize: 14, color: colors.foregroundMuted }}>
                    {entry.value}
                  </Text>
                ) : null}
                {entry.dot ? (
                  <View
                    style={{
                      width: filledDotSize,
                      height: filledDotSize,
                      borderRadius: filledDotSize / 2,
                      backgroundColor: colors.statusSuccess,
                    }}
                  />
                ) : null}
                {entry.chevron ? (
                  <Icon name="ChevronRight" size={14} color={colors.foregroundMuted} />
                ) : null}
                {entry.selected ? (
                  <Icon name="Check" size={16} color={colors.foregroundMuted} />
                ) : null}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  );
}
