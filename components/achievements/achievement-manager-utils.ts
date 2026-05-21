import { getSafeTone } from "@/components/achievements/achievement-card";
import { unlockRevealLutSteps } from "@/lib/badge/shape-utils";
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
    achievedAt: "",
  };
}

export function sortAchievements(rows: AchievementRecord[]) {
  return [...rows].sort((a, b) => {
    const aDated = Boolean(a.achieved_at);
    const bDated = Boolean(b.achieved_at);

    if (aDated !== bDated) {
      return aDated ? 1 : -1;
    }

    if (aDated && bDated) {
      const aTime = new Date(`${a.achieved_at}T00:00:00`).getTime();
      const bTime = new Date(`${b.achieved_at}T00:00:00`).getTime();
      if (bTime !== aTime) {
        return bTime - aTime;
      }
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function resolveTone(achievement: AchievementRecord | null) {
  return getSafeTone(achievement?.tone);
}
