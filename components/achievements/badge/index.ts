/** Public badge module surface — prefer importing from here. */

export { BadgeSlot } from "./chrome/badge-slot";
export {
  BadgeIconDisc,
  badgeIconDiscSizeStyles,
} from "./chrome/badge-icon-disc";
export { BadgeAttributionPopover } from "./chrome/badge-attribution-popover";

export { RemoteBadgeImage } from "./display/remote-badge-image";
export { FallbackBadge } from "./display/fallback-badge";
export { FloatingBadgeWrapper } from "./display/floating-badge-wrapper";

export {
  BadgeParallaxViewer,
  type BadgeParallaxViewerProps,
} from "./parallax/badge-parallax-viewer";

export {
  BadgeGltfViewer,
  type BadgeGltfViewerProps,
  revokeBadgeModelPoseSession,
  type BadgeModelPoseSession,
  prepareBadgeModelUpload,
  type PreparedBadgeModelUpload,
  useBadgeModelUploader,
  applyBadgeModelPoseSessionToForm,
  clearBadgeModelPoseSessionRef,
  type BadgeModelUploadStaged,
  useSignedBadgeModelUrl,
} from "./model";

export { ImpressionGlitterField } from "./effects/impression-glitter-field";
export { ImpressionBurst } from "./effects/impression-burst";
export { UnlockRevealWave } from "./effects/unlock-reveal-wave";
export { DedicatedBadgeGlitter } from "./effects/dedicated-badge-glitter";

export {
  DetailBadgeInteractive,
  type DetailBadgeInteractiveProps,
} from "./detail/detail-badge-interactive";
export {
  BadgeImageParallaxView,
  type BadgeImageParallaxViewProps,
} from "./detail/badge-image-parallax-view";

export { BadgeEditor } from "./editor/badge-editor";

export {
  createBadgeRemoteAsset,
  clearSessionStagedUpload,
  setSessionStagedUpload,
  deleteBadgeRemoteAssetQuietly,
  getReplacedBadgeRemoteAsset,
  rollbackBadgeUploadSession,
} from "./upload/badge-asset-session";
export { normalizeImageKitFileId } from "./upload/badge-imagekit-session";
export { useBadgeImageUploader } from "./upload/use-badge-image-uploader";

export { useBadgeMetricsController } from "./hooks/use-badge-metrics-controller";
export { useBadgeChunkedPrewarm } from "./hooks/use-badge-chunked-prewarm";

export { submitImpression } from "./effects/use-impression-on-badge";
export type { ImpressionResult } from "./effects/use-impression-on-badge";

export {
  useBadgeSessionController,
  type BadgeSessionController,
} from "./upload/use-badge-session-controller";
