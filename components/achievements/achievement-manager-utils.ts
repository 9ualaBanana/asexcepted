import { unlockRevealLutSteps } from "@/lib/achievements/badge/parallax/shape-utils";
import {
  type AchievementTone,
} from "@/lib/achievements/data/achievement-enums";
import {
  createInitialForm,
  type FormState,
} from "@/lib/achievements/data/achievement-form-state";

export type { AchievementTone };
export { createInitialForm, type FormState };

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

export const UNLOCK_HOLD_DURATION_MS = Number(
  process.env.NEXT_PUBLIC_UNLOCK_HOLD_DURATION_MS,
);
export const UNLOCK_REVEAL_DURATION_MS = Number(
  process.env.NEXT_PUBLIC_UNLOCK_REVEAL_DURATION_MS,
);
export const UNLOCK_REVEAL_LUT_STEPS = unlockRevealLutSteps();
