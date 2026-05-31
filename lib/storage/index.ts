export { storageKeys, type StorageKey } from "@/lib/storage/keys";
export {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
} from "@/lib/storage/client";
export {
  createBooleanPreference,
  deserializeStoredBoolean,
} from "@/lib/storage/boolean-preference";
export { readJsonArray, writeJsonArray } from "@/lib/storage/json-preference";
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
} from "@/lib/storage/preferences";
