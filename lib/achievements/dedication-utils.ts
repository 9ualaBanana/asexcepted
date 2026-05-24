import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import type { FormState } from "@/components/achievements/achievement-editor-shared";

/** Sender-dedicated row (pending or accepted). */
export function isDedicatedAchievement(
  achievement: Pick<AchievementRecord, "dedicated_by_user_id">,
): boolean {
  return Boolean(achievement.dedicated_by_user_id);
}

/** Accepted dedication in the owner's collection — visibility may be edited only. */
export function canEditDedicatedVisibility(
  achievement: Pick<AchievementRecord, "dedicated_by_user_id" | "dedication_status">,
): boolean {
  return (
    Boolean(achievement.dedicated_by_user_id) &&
    achievement.dedication_status === "accepted"
  );
}

/** In-collection dedication (accepted, or legacy row missing status). */
export function showsDedicatedBadgeAura(
  achievement: Pick<
    AchievementRecord,
    "dedicated_by_user_id" | "dedication_status"
  >,
): boolean {
  if (!achievement.dedicated_by_user_id) return false;
  if (achievement.dedication_status === "pending") return false;
  return true;
}

export function isDedicatedVisibilityDirty(
  form: Pick<FormState, "visibility">,
  record: Pick<AchievementRecord, "visibility">,
): boolean {
  return form.visibility !== record.visibility;
}