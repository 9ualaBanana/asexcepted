/** Public badge module surface — prefer importing from here. */

export { BadgeSlot } from "./chrome/badge-slot";
export {
  BadgeIconDisc,
  badgeIconDiscSizeStyles,
} from "./chrome/badge-icon-disc";
export { BadgeAttributionPopover } from "./chrome/badge-attribution-popover";

export { RemoteBadgeImage } from "./display/remote-badge-image";
export { FallbackBadge } from "./display/fallback-badge";

export {
  BadgeParallaxViewer,
  Badge3DViewer,
  type BadgeParallaxViewerProps,
  type Badge3DViewerProps,
} from "./parallax/badge-parallax-viewer";

export {
  BadgeModelViewer,
  type BadgeModelViewerProps,
} from "./model/badge-model-viewer";

export { ImpressionGlitterField } from "./effects/impression-glitter-field";
export { ImpressionBurst } from "./effects/impression-burst";
export { UnlockRevealWave } from "./effects/unlock-reveal-wave";
export { DedicatedBadgeGlitter } from "./effects/dedicated-badge-glitter";

export {
  DetailBadgeInteractive,
  type DetailBadgeInteractiveProps,
} from "./detail/detail-badge-interactive";
export { BadgeModelLiveView, type BadgeModelLiveViewProps } from "./detail/badge-model-live-view";
export {
  BadgeImageParallaxView,
  type BadgeImageParallaxViewProps,
} from "./detail/badge-image-parallax-view";

export { RoundBadgeEditor } from "./editor/round-badge-editor";

export {
  createBadgeRemoteAsset,
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
export { useBadgeMetricsController } from "./hooks/use-badge-metrics-controller";
export { useBadgeChunkedPrewarm } from "./hooks/use-badge-chunked-prewarm";

export { submitImpression } from "./effects/use-impression-on-badge";
export type { ImpressionResult } from "./effects/use-impression-on-badge";

export {
  useBadgeSessionController,
  type BadgeSessionController,
} from "./upload/use-badge-session-controller";
