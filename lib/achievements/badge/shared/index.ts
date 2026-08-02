/** Shared badge assets and 2D render helpers (used by parallax + 3D preview). */

export {
  BADGE_MODEL_BUCKET,
  BADGE_PREVIEW_BUCKET,
  BADGE_MODEL_MAX_FILE_BYTES,
  BADGE_PREVIEW_MAX_FILE_BYTES,
  buildBadgeModelPath,
  buildBadgePreviewPath,
  buildShareInviteBadgeModelPath,
  buildShareInviteBadgePreviewPath,
  isModelGlbAsset,
  isGlbHeader,
  isModelBadgeAssetKind,
  applyBadgeModelToForm,
  badgeModelFromForm,
  badgeModelFromStagedUpload,
  parseBadgeModelAsset,
  patchBadgeModelAsset,
  badgeModelAssetFieldsFromModel,
  type BadgeModelAsset,
  type BadgeModelAssetFields,
  isPublicHttpImageUrl,
  isShareInviteBadgeModelPath,
  looksLikeGlbUpload,
  sanitizeBadgeAssetPath,
  normalizeBadgeIconUrl,
} from "./badge-assets";

export {
  clearBadgeRenderCacheForSrc,
  ensureBadgeAlphaMaskData,
  ensureBadgeImageDecoded,
  getCachedBadgeMaskStyle,
  getCachedBadgeMotionStyle,
  getCachedAlphaMaskData,
  hasBadgeDecodeCached,
  isBadgeImageDecodeSettled,
  prewarmBadgeRenderCache,
  useBadgeRenderSrc,
} from "./render-cache";

export { makeBadgeMotionStyle } from "./motion";
export { decodeImageReadyPromise } from "./image-decode";
