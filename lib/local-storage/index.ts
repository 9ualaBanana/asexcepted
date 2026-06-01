export { storageKeys, type StorageKey } from "@/lib/local-storage/keys";
export {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
} from "@/lib/local-storage/client";
export {
  createBooleanPreference,
  deserializeStoredBoolean,
} from "@/lib/local-storage/boolean-preference";
export { readJsonArray, writeJsonArray } from "@/lib/local-storage/json-preference";
export {
  soundsEnabledPreference,
  useSoundsEnabledPreference,
  hideLockedPreference,
  useHideLockedPreference,
  resetHideLockedPreferenceForNewAccount,
  badgeDebugOverlayPreference,
  useBadgeDebugOverlayPreference,
  type AchievementVisibilityFilter,
  readVisibilityFilterPreference,
  writeVisibilityFilterPreference,
  cycleVisibilityFilter,
  useVisibilityFilterPreference,
  isTutorialCompleted,
  markTutorialCompleted,
} from "@/lib/local-storage/preferences";
