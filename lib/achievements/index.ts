/** Achievement domain + badge pipeline — prefer subpath imports for tree-shaking. */

export type {
  AchievementDbRow,
  AchievementDbWritePayload,
  SaveAchievementCommand,
} from "./domain/db-row";
export {
  ACHIEVEMENT_ICON_KEYS,
  ACHIEVEMENT_TONES,
  ACHIEVEMENT_VISIBILITIES,
  ICON_ASSET_KINDS,
  DEFAULT_ACHIEVEMENT_ICON_KEY,
  DEFAULT_ACHIEVEMENT_TONE,
  DEFAULT_ACHIEVEMENT_VISIBILITY,
  DEFAULT_ICON_ASSET_KIND,
  achievementIconKeySchema,
  achievementToneSchema,
  achievementVisibilitySchema,
  iconAssetKindSchema,
  type AchievementIconKey,
  type AchievementTone,
  type AchievementVisibility,
  type IconAssetKind,
} from "./domain/enums";
export {
  tryNormalizeAchievement,
  normalizeAchievementRowsForList,
  achievementDomainRowSchema,
  type AchievementDomainRow,
} from "./domain/achievement";
export {
  type AchievementCollectionEntryViewModel,
  type AchievementDetailViewModel,
  type AchievementGridViewModel,
  achievementDetailToForm,
  collectionEntryFromDetail,
  detailToShareInviteSnapshotSource,
  domainRowToCollectionEntry,
  domainRowToDetailViewModel,
  formToSaveCommand,
  isAchievementFormDirty,
  mapCollectionDetails,
  sortCollectionEntries,
  updateCollectionEntryDetail,
  upsertCollectionEntry,
} from "./presentation/collection-view-models";
export {
  createInitialForm,
  hasMeaningfulContent,
  toNullable,
  type FormState,
} from "./presentation/form-state";
export {
  createAchievement,
  deleteAchievement,
  getAchievementEmbedBadgeById,
  getAchievementEmbedMintForOwner,
  listAchievements,
  unlockAchievement,
  updateAchievement,
} from "./persistence/achievements";
export {
  listCollection,
  createCollectionAchievement,
  updateCollectionAchievement,
  deleteCollectionAchievement,
  unlockCollectionAchievement,
} from "./application/collection";
export {
  type AchievementEmbedBadgeViewModel,
  type AchievementEmbedMintViewModel,
  type AchievementFeedItemViewModel,
  type AchievementShareInviteBadgeViewModel,
  type FeedEventType,
  type FollowingUnlockFeedRow,
  FEED_EVENT_TYPES,
  embedBadgeRowToViewModel,
  embedMintRowToViewModel,
  feedRpcRowToViewModel,
  followingUnlockFeedRowSchema,
  followingUnlockFeedRowsSchema,
  shareInviteRowToBadgeViewModel,
} from "./presentation/surface-view-models";
export {
  type FeedCursor,
  type FeedPage,
} from "./persistence/feed";
export { fetchFollowingUnlockFeed } from "./application/feed";

export {
  canEditDedicatedVisibility,
  isDedicatedAchievement,
  isDedicatedVisibilityDirty,
  showsDedicatedBadgeAura,
  showsDedicatedBadgeEffect,
} from "./presentation/collection-view-models";

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
