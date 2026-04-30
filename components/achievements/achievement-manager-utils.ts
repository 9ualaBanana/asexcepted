import { getSafeTone } from "@/components/achievements/achievement-card";
import { unlockRevealLutSteps } from "@/components/achievements/badge/badge-shape-utils";
import {
  type FormState,
  todayDateString,
} from "@/components/achievements/achievement-editor-shared";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";

export const UNLOCK_HOLD_DURATION_MS = 500;
export const UNLOCK_REVEAL_DURATION_MS = 5000;
export const UNLOCK_REVEAL_LUT_STEPS = unlockRevealLutSteps();

export function createInitialForm(): FormState {
  return {
    title: "",
    description: "",
    category: "",
    icon: "trophy",
    iconUrl: "",
    iconFileId: "",
    tone: "teal",
    isLocked: true,
    achievedAt: todayDateString(),
  };
}

export function sortAchievements(rows: AchievementRecord[]) {
  return [...rows].sort((a, b) => {
    const aPrimary = a.achieved_at
      ? new Date(`${a.achieved_at}T23:59:59`).getTime()
      : new Date(a.created_at).getTime();
    const bPrimary = b.achieved_at
      ? new Date(`${b.achieved_at}T23:59:59`).getTime()
      : new Date(b.created_at).getTime();

    if (bPrimary !== aPrimary) {
      return bPrimary - aPrimary;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function resolveTone(achievement: AchievementRecord | null) {
  return getSafeTone(achievement?.tone);
}

export function tryGetHighResNow() {
  return typeof performance !== "undefined" && Number.isFinite(performance.now())
    ? performance.now()
    : Date.now();
}
