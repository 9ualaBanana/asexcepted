import type { AchievementDetailViewModel } from "@/lib/achievements/data/achievement-view-models";
import type { FormState } from "@/components/achievements/achievement-editor-shared";
import { hasModelGlbAsset } from "@/lib/achievements/badge/shared/badge-assets";

/** Sender-dedicated row (pending or accepted). */
export function isDedicatedAchievement(
  achievement: Pick<AchievementDetailViewModel, "dedicatedByUserId">,
): boolean {
  return Boolean(achievement.dedicatedByUserId);
}

/** Accepted dedication in the owner's collection — visibility may be edited only. */
export function canEditDedicatedVisibility(
  achievement: Pick<AchievementDetailViewModel, "dedicatedByUserId" | "dedicationStatus">,
): boolean {
  return (
    Boolean(achievement.dedicatedByUserId) &&
    achievement.dedicationStatus === "accepted"
  );
}

/** In-collection dedication (accepted, or legacy row missing status). */
export function showsDedicatedBadgeAura(
  achievement: Pick<
    AchievementDetailViewModel,
    "dedicatedByUserId" | "dedicationStatus"
  >,
): boolean {
  if (!achievement.dedicatedByUserId) return false;
  if (achievement.dedicationStatus === "pending") return false;
  return true;
}

/** Grid/feed particle glitter — image badges only (not 3D model_glb). */
export function showsDedicatedBadgeEffect(
  achievement: Pick<
    AchievementDetailViewModel,
    | "dedicatedByUserId"
    | "dedicationStatus"
    | "iconAssetKind"
    | "iconAssetPath"
  >,
): boolean {
  return (
    showsDedicatedBadgeAura(achievement) &&
    !hasModelGlbAsset(achievement.iconAssetKind, achievement.iconAssetPath)
  );
}

export function isDedicatedVisibilityDirty(
  form: Pick<FormState, "visibility">,
  detail: Pick<AchievementDetailViewModel, "visibility">,
): boolean {
  return form.visibility !== detail.visibility;
}