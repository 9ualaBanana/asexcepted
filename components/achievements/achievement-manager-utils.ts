import { unlockRevealLutSteps } from "@/lib/badge/shape-utils";

export type AchievementTone =
  | "rose"
  | "indigo"
  | "teal"
  | "orange"
  | "lime"
  | "fuchsia";

export const achievementToneStyles: Record<AchievementTone, string> = {
  rose: "from-rose-300/20 via-pink-200/10 to-transparent border-rose-300/30",
  indigo:
    "from-indigo-300/20 via-blue-200/10 to-transparent border-indigo-300/30",
  teal: "from-teal-300/20 via-cyan-200/10 to-transparent border-teal-300/30",
  orange:
    "from-orange-300/20 via-amber-200/10 to-transparent border-orange-300/30",
  lime: "from-lime-300/20 via-emerald-200/10 to-transparent border-lime-300/30",
  fuchsia:
    "from-fuchsia-300/20 via-pink-200/10 to-transparent border-fuchsia-300/30",
};

export const achievementToneSwatches: Record<AchievementTone, string> = {
  rose: "bg-rose-400",
  indigo: "bg-indigo-400",
  teal: "bg-teal-400",
  orange: "bg-orange-400",
  lime: "bg-lime-400",
  fuchsia: "bg-fuchsia-400",
};

export function getSafeTone(value?: string | null): AchievementTone {
  if (value && value in achievementToneStyles) {
    return value as AchievementTone;
  }
  return "teal";
}
import { type FormState } from "@/components/achievements/achievement-editor-shared";
import type { AchievementRecord } from "@/lib/achievements/data/achievement-transformers";

export const UNLOCK_HOLD_DURATION_MS = Number(
  process.env.NEXT_PUBLIC_UNLOCK_HOLD_DURATION_MS,
);
export const UNLOCK_REVEAL_DURATION_MS = Number(
  process.env.NEXT_PUBLIC_UNLOCK_REVEAL_DURATION_MS,
);
export const UNLOCK_REVEAL_LUT_STEPS = unlockRevealLutSteps();

export function createInitialForm(): FormState {
  return {
    title: "",
    description: "",
    category: "",
    icon: "trophy",
    iconUrl: "",
    iconFileId: "",
    iconAssetKind: "image",
    iconAssetPath: "",
    iconCcAttribution: "",
    iconModelYaw: 0,
    iconModelPitch: 0,
    iconModelAnimationPlay: true,
    iconModelAnimationSpeed: 1,
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
