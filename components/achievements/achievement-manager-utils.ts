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
    visibility: "public",
  };
}

function createdAtMs(record: AchievementRecord): number {
  return new Date(record.created_at).getTime();
}

function achievedAtMs(record: AchievementRecord): number {
  if (!record.achieved_at) return 0;
  return new Date(`${record.achieved_at}T00:00:00`).getTime();
}

/** 0 = locked undated, 1 = unlocked undated, 2 = has achieved_at */
function achievementSortKey(record: AchievementRecord): [number, number, number] {
  const dated = Boolean(record.achieved_at);
  if (!dated && record.is_locked) return [0, 0, -createdAtMs(record)];
  if (!dated && !record.is_locked) return [1, 0, -createdAtMs(record)];
  return [2, -achievedAtMs(record), -createdAtMs(record)];
}

export function sortAchievements(rows: AchievementRecord[]) {
  return [...rows].sort((a, b) => {
    const ak = achievementSortKey(a);
    const bk = achievementSortKey(b);
    for (let i = 0; i < ak.length; i++) {
      if (ak[i] !== bk[i]) return ak[i] - bk[i];
    }
    return 0;
  });
}

export function resolveTone(achievement: AchievementRecord | null) {
  return getSafeTone(achievement?.tone);
}
