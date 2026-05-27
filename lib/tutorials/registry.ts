export const TUTORIAL_IDS = {
  impressionDoubleTap: "impression_double_tap",
  unlockHold: "unlock_hold",
  badgeSpin: "badge_spin",
  pwaInstall: "pwa_install",
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
  [TUTORIAL_IDS.badgeSpin]: {
    id: TUTORIAL_IDS.badgeSpin,
    message: "Drag the badge to spin it.",
  },
  [TUTORIAL_IDS.pwaInstall]: {
    id: TUTORIAL_IDS.pwaInstall,
    message:
      "Add the app to your home screen to receive push notifications about achievements from people you follow.",
  },
};

export function getTutorial(id: TutorialId): TutorialDefinition {
  return TUTORIAL_REGISTRY[id];
}
