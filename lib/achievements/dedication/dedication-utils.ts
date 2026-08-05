import type { FormState } from "@/lib/achievements/data/achievement-form-state";
import type { AchievementDetailViewModel } from "@/lib/achievements/data/achievement-view-models";

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

/** Accepted (or legacy null status) dedication — gold aura, not pending gift queue. */
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

/** Particle glitter when dedicated aura applies and the badge is not a 3D model. */
export function showsDedicatedBadgeEffect(
  showsAura: boolean,
  isModelBadge: boolean,
): boolean {
  return showsAura && !isModelBadge;
}

export function isDedicatedVisibilityDirty(
  form: Pick<FormState, "visibility">,
  detail: Pick<AchievementDetailViewModel, "visibility">,
): boolean {
  return form.visibility !== detail.visibility;
}
