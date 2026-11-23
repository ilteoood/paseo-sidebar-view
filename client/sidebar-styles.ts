import { Platform, type Animated } from "react-native";

export const hoverTint = "rgba(127, 127, 127, 0.08)";
export const pressedTint = "rgba(127, 127, 127, 0.14)";
export const selectedTint = "rgba(127, 127, 127, 0.1)";

export const isTouchPlatform = Platform.OS !== "web";

export const listPadding = { paddingHorizontal: 8, paddingTop: 2, paddingBottom: 16 } as const;

export const sectionHeader = {
  minHeight: 36,
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingLeft: 8,
  paddingRight: 4,
} as const;
export const projectRow = {
  minHeight: 28,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingVertical: 4,
  paddingRight: 4,
  paddingLeft: 8,
  borderRadius: 8,
  marginBottom: 2,
} as const;
export const workspaceRow = {
  minHeight: 28,
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 2,
  paddingVertical: 4,
  paddingRight: 4,
  borderRadius: 8,
  gap: 4,
} as const;
export const groupSpacing = { paddingBottom: 12 } as const;
export const emptyNotice = { fontSize: 12 } as const;
export const emptyNoticeCard = { fontSize: 14, lineHeight: 20, fontWeight: "600" } as const;
export const emptyCard = {
  paddingHorizontal: 16,
  paddingVertical: 20,
  marginHorizontal: 8,
  marginTop: 4,
  marginBottom: 8,
  borderRadius: 8,
  gap: 4,
} as const;
export const statusGroupHeader = {
  minHeight: 32,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 8,
  paddingTop: 6,
  paddingBottom: 2,
  cursor: "pointer",
} as const;
export const statusHeaderLeading = { width: 14, height: 14, alignItems: "center", justifyContent: "center" } as const;
export const leadingSlot = { width: 16, height: 20, alignItems: "center", justifyContent: "center" } as const;
export const trailingHitBox = {
  width: 36,
  height: 36,
  marginVertical: -8,
  marginRight: -6,
  alignSelf: "center",
  alignItems: "center",
  justifyContent: "center",
} as const;
export const trailingHighlight = {
  width: 24,
  height: 24,
  borderRadius: 6,
  alignItems: "center",
  justifyContent: "center",
} as const;
// The workspace row gaps its trailing actions 4px tighter, so the archive clears that difference to land on the plus box.
export const archiveAction = {
  ...trailingHitBox,
  marginRight: trailingHitBox.marginRight + projectRow.gap - workspaceRow.gap,
} as const;
export const displayTrigger = {
  width: 24,
  height: 24,
  borderRadius: 6,
  alignItems: "center",
  justifyContent: "center",
} as const;
export const dialogButton = {
  minHeight: 36,
  paddingHorizontal: 12,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
} as const;

export const menuRowMinHeight = isTouchPlatform ? 44 : 28;
export const menuRow = {
  minHeight: menuRowMinHeight,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginHorizontal: 4,
  paddingHorizontal: 8,
  borderRadius: 6,
} as const;
export const menuPagePadding = 4;
export const menuBorderWidth = 1;
export const menuIconSize = 14;
export const menuSeparatorHeight = 9;

export const filledDotSize = 6;
export const doneDotOpacity = 0.3;
export const titleIdleOpacity = 0.76;
export const statusIconSize = 12;
export const runningIconSize = 14;



export const spinnerStyle = (rotation: Animated.AnimatedInterpolation<string>) => ({
  transform: [{ rotate: rotation }],
});
