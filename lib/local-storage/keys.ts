/** Namespaced localStorage keys for client preferences. */
export const storageKeys = {
  soundsEnabled: "asexcepted.soundsEnabled",
  hideLockedAchievements: "asexcepted.hideLockedAchievements",
  achievementVisibilityFilter: "asexcepted.achievementVisibilityFilter",
  badgeDebugOverlay: "asexcepted.badgeDebugOverlay",
  tutorialsCompleted: "asexcepted.tutorials.completed",
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];
