/** Achievement domain + badge pipeline — prefer subpath imports for tree-shaking. */

export type {
  Achievement,
  AchievementCreate,
  AchievementWrite,
} from "./domain/achievement";
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
  parseAchievement,
  parseAchievements,
  achievementSchema,
} from "./domain/achievement";
export {
  FEED_EVENT_TYPES,
  type FeedEventType,
  type FollowingUnlockFeedEvent,
  followingUnlockFeedEventSchema,
  followingUnlockFeedEventsSchema,
  followingUnlockFeedRowSchema,
  followingUnlockFeedRowsSchema,
  type FollowingUnlockFeedRow,
} from "./domain/feed-event";
export {
  type AchievementCollectionEntryViewModel,
  type AchievementDetailViewModel,
  type AchievementGridViewModel,
  achievementDetailToForm,
  collectionEntryFromDetail,
  detailToShareInviteSnapshotSource,
  achievementToCollectionEntry,
  achievementToDetailViewModel,
  achievementsToCollectionEntries,
  formToAchievementWrite,
  isAchievementFormDirty,
  mapCollectionDetails,
  sortCollectionEntries,
  updateCollectionEntryDetail,
  upsertCollectionEntry,
  canEditDedicatedVisibility,
  isDedicatedAchievement,
  isDedicatedVisibilityDirty,
  showsDedicatedBadgeAura,
  showsDedicatedBadgeEffect,
} from "./presentation/collection-view-models";
export {
  createInitialForm,
  hasMeaningfulContent,
  toNullable,
  type FormState,
} from "./presentation/form-state";
export {
  deleteAchievementForOwner,
  getAchievementForUnlockPush,
  getAchievementDedicationNotifyRow,
  getAchievementShareInviteSnapshotRow,
  getAchievementIdForOwner,
  getAchievementOwnerUserId,
} from "./persistence/achievements";

export type {
  AchievementPort,
  DedicationPort,
  EmbedPort,
  FeedPort,
  ImpressionPort,
  FeedCursor,
  FeedEventPage,
} from "./application/ports";
export {
  createAchievementPort,
  createDedicationPort,
  createEmbedPort,
  createFeedPort,
  createImpressionPort,
} from "./application/adapters";

export {
  listAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  unlockAchievement,
} from "./application/achievements";
export {
  listCollection,
  type ListCollectionPorts,
  type ListCollectionResult,
} from "./application/collection";
export {
  createImpression,
  loadImpressionCountMap,
} from "./application/impressions";
export {
  type FeedPage,
  loadFollowingUnlockFeed,
} from "./application/feed";
export {
  listPendingDedications,
  acceptPendingDedication,
  rejectPendingDedication,
} from "./application/dedication-queue";
export { loadEmbedBadge, loadEmbedMint } from "./application/embed";

export {
  type AchievementEmbedBadgeViewModel,
  type AchievementEmbedMintViewModel,
  type AchievementFeedItemViewModel,
  type AchievementShareInviteBadgeViewModel,
  embedBadgeRowToViewModel,
  embedMintRowToViewModel,
  feedEventToViewModel,
  feedRpcRowToViewModel,
  shareInviteRowToBadgeViewModel,
} from "./presentation/surface-view-models";

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
