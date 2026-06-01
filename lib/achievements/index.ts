/** Achievement domain + badge pipeline — prefer subpath imports for tree-shaking. */

export type {
  AchievementDbRow,
  AchievementDbWritePayload,
} from "./data/achievement-db-schema";
export {
  type AchievementRecord,
  achievementToForm,
  achievementToGridItem,
  coerceAchievementDbRow,
  formToPayload,
  hasCustomBadge,
  isAchievementFormDirty,
  tryNormalizeAchievement,
} from "./data/achievement-transformers";
export {
  createAchievement,
  deleteAchievement,
  listAchievements,
  unlockAchievement,
  updateAchievement,
} from "./data/achievement-db";
export {
  attachImpressionCounts,
  fetchImpressionCountMap,
} from "./data/impression-counts";

export {
  canEditDedicatedVisibility,
  isDedicatedAchievement,
  isDedicatedVisibilityDirty,
  showsDedicatedBadgeAura,
  showsDedicatedBadgeEffect,
} from "./dedication/dedication-utils";

export {
  useHideLockedPreference,
  resetHideLockedPreferenceForNewAccount,
  useVisibilityFilterPreference,
  type AchievementVisibilityFilter,
} from "@/lib/local-storage";

export {
  BADGE_MODEL_BUCKET,
  BADGE_PREVIEW_BUCKET,
  hasModelGlbAsset,
  isModelBadgeAssetKind,
  isPublicHttpImageUrl,
} from "./badge/badge-assets";
