/** Public badge module surface — prefer importing from here. */

export { AchievementBadgeSlot } from "./chrome/achievement-badge-slot";
export {
  AchievementBadgeIconDisc,
  achievementBadgeIconDiscSizeStyles,
} from "./chrome/achievement-badge-icon-disc";
export { BadgeAttributionPopover } from "./chrome/badge-attribution-popover";

export { RemoteBadgeImage } from "./display/achievement-remote-badge-image";
export { AchievementFallbackBadge } from "./display/achievement-fallback-badge";

export {
  AchievementBadgeParallaxViewer,
  AchievementBadge3DViewer,
  type AchievementBadgeParallaxViewerProps,
  type AchievementBadge3DViewerProps,
} from "./parallax/achievement-badge-parallax-viewer";

export {
  AchievementBadgeModelViewer,
  type AchievementBadgeModelViewerProps,
} from "./model/achievement-badge-model-viewer";

export { ImpressionGlitterField } from "./effects/impression-glitter-field";
export { ImpressionBurst } from "./effects/impression-burst";
export { UnlockRevealWave } from "./effects/unlock-reveal-wave";
export { DedicatedBadgeGlitter } from "./effects/dedicated-badge-glitter";

export {
  AchievementDetailBadgeInteractive,
  type AchievementDetailBadgeInteractiveProps,
} from "./detail/achievement-detail-badge-interactive";
export { BadgeModelLiveView, type BadgeModelLiveViewProps } from "./detail/badge-model-live-view";
export {
  BadgeImageParallaxView,
  type BadgeImageParallaxViewProps,
} from "./detail/badge-image-parallax-view";

export { AchievementRoundBadgeEditor } from "./editor/achievement-round-badge-editor";

export {
  createAchievementBadgeRemoteAsset,
  clearSessionStagedUpload,
  setSessionStagedUpload,
  deleteBadgeRemoteAssetQuietly,
  getReplacedBadgeRemoteAsset,
  rollbackBadgeUploadSession,
} from "./upload/badge-asset-session";
export {
  revokeBadgeModelPoseSession,
  type BadgeModelPoseSession,
} from "./upload/badge-model-pose-session";
export { prepareBadgeModelUpload, type PreparedBadgeModelUpload } from "./upload/badge-model-upload-client";
export { normalizeImageKitFileId } from "./upload/badge-imagekit-session";
export { useBadgeImageUploader } from "./upload/use-badge-image-uploader";
export {
  useBadgeModelUploader,
  applyBadgeModelPoseSessionToForm,
  clearBadgeModelPoseSessionRef,
  type BadgeModelUploadStaged,
} from "./upload/use-badge-model-uploader";

export { useSignedBadgeModelUrl } from "./hooks/use-signed-badge-model-url";
