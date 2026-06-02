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
  hasModelGlbAsset,
  isGlbHeader,
  isModelBadgeAssetKind,
  isPublicHttpImageUrl,
  isShareInviteBadgeModelPath,
  looksLikeGlbUpload,
  sanitizeBadgeAssetPath,
  normalizeBadgeIconUrl,
  trimBadgeIconUrl,
} from "./badge-assets";

export {
  cloneBadgeModelForClaimer,
  completeBadgeModelUpload,
  createBadgeModelUploadTarget,
  createSignedBadgeModelUrl,
  deleteBadgeRemoteAsset,
  pinBadgeAssetsForShareInvite,
  resolveClaimedBadgeIconFields,
  type BadgeModelUploadTarget,
  type ClonedBadgeModelAsset,
} from "./badge-assets-server";

export { toOptimizedRenderSrc } from "./render-src";

export {
  clearBadgeRenderCacheForSrc,
  ensureBadgeAlphaMaskData,
  ensureBadgeImageDecoded,
  getCachedBadgeMaskStyle,
  getCachedBadgeMotionStyle,
  getCachedAlphaMaskData,
  hasBadgeDecodeCached,
  prewarmBadgeRenderCache,
  useBadgeRenderSrc,
} from "./render-cache";

export { makeBadgeMotionStyle } from "./motion";
export { decodeImageReadyPromise } from "./image-decode";
