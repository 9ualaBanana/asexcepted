/** Shared detail-surface facts for badge gesture presentation hooks. */
export type DetailBadgeGestureSurface = {
  detailMode: "view" | "edit";
  locked: boolean;
  unlocking: boolean;
  present: boolean;
  readOnly: boolean;
};
