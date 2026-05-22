export const TUTORIAL_IDS = {
  impressionDoubleTap: "impression_double_tap",
  unlockHold: "unlock_hold",
} as const;

export type TutorialId = (typeof TUTORIAL_IDS)[keyof typeof TUTORIAL_IDS];

export type TutorialDefinition = {
  id: TutorialId;
  message: string;
};

export const TUTORIAL_REGISTRY: Record<TutorialId, TutorialDefinition> = {
  [TUTORIAL_IDS.impressionDoubleTap]: {
    id: TUTORIAL_IDS.impressionDoubleTap,
    message: "Double-tap badge to express your impression!",
  },
  [TUTORIAL_IDS.unlockHold]: {
    id: TUTORIAL_IDS.unlockHold,
    message: "Press and hold the badge to unlock it.",
  },
};

export function getTutorial(id: TutorialId): TutorialDefinition {
  return TUTORIAL_REGISTRY[id];
}
