/** Achievement domain + badge pipeline — prefer subpath imports for tree-shaking. */

export type {
  AchievementDbRow,
  AchievementDbWritePayload,
} from "./data/achievement-db-schema";
export {
  ACHIEVEMENT_ICON_KEYS,
  ACHIEVEMENT_TONES,
  DEFAULT_ACHIEVEMENT_ICON_KEY,
  DEFAULT_ACHIEVEMENT_TONE,
  DEFAULT_ACHIEVEMENT_VISIBILITY,
  DEFAULT_ICON_ASSET_KIND,
  parseIconAssetKind,
  parseIconKey,
  parseTone,
  parseVisibility,
  type AchievementIconKey,
  type AchievementTone,
  type AchievementVisibility,
  type IconAssetKind,
} from "./data/achievement-enums";
export {
  tryNormalizeAchievement,
  coerceAchievementDbRow,
  type AchievementDomainRow,
} from "./data/achievement-transformers";
export {
  type AchievementCollectionEntryViewModel,
  type AchievementDetailViewModel,
  type AchievementGridViewModel,
  achievementDetailToForm,
  collectionEntryFromDetail,
  detailToShareInviteSnapshotSource,
  domainRowToCollectionEntry,
  domainRowToDetailViewModel,
  formToPayload,
  isAchievementFormDirty,
  mapCollectionDetails,
  sortCollectionEntries,
  updateCollectionEntryDetail,
  upsertCollectionEntry,
} from "./data/achievement-view-models";
export {
  createInitialForm,
  hasMeaningfulContent,
  toNullable,
  type FormState,
} from "./data/achievement-form-state";
export {
  createAchievement,
  deleteAchievement,
  getAchievementEmbedBadgeById,
  getAchievementEmbedMintForOwner,
  listAchievements,
  unlockAchievement,
  updateAchievement,
} from "./data/achievement-repository";
export {
  attachImpressionCounts,
  fetchImpressionCountMap,
} from "./data/impression-counts";
export {
  type AchievementEmbedBadgeViewModel,
  type AchievementEmbedMintViewModel,
  type AchievementFeedItemViewModel,
  type AchievementShareInviteBadgeViewModel,
  type FeedEventType,
  embedBadgeRowToViewModel,
  embedMintRowToViewModel,
  feedRowSourceToViewModel,
  shareInviteRowToBadgeViewModel,
} from "./data/achievement-surface-view-models";
export {
  fetchFollowingUnlockFeed,
  type FeedCursor,
  type FeedPage,
} from "./data/feed-db";

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
  isModelGlbAsset,
  isModelBadgeAssetKind,
  isPublicHttpImageUrl,
  parseBadgeModelAsset,
  badgeModelFromStagedUpload,
  type BadgeModelAsset,
  type BadgeModelAssetFields,
} from "./badge/shared/badge-assets";
