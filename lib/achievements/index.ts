/** Achievement domain + badge pipeline — prefer subpath imports for tree-shaking. */

export type {
  AchievementDbRow,
  AchievementDbWritePayload,
} from "./data/achievement-db-schema";
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
  achievementToForm,
  achievementToGridItem,
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
  getAchievementEmbedBadgeById,
  getAchievementEmbedMintForOwner,
} from "./data/achievement-queries";

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
  badgeRemoteAssetFromModelFields,
  type BadgeModelAsset,
  type BadgeModelAssetFields,
} from "./badge/shared/badge-assets";
