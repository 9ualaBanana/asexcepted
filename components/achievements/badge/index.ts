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

export { BadgeGltfViewer, type BadgeGltfViewerProps } from "./model";
export { useSignedBadgeModelUrl } from "./model";

export {
  revokeBadgeModelPoseSession,
  type BadgeModelPoseSession,
  type BadgeModelPoseSessionApi,
} from "./upload/session/badge-model-pose-session";
export {
  prepareBadgeModelUpload,
  type PreparedBadgeModelUpload,
} from "./upload/model/badge-model-upload-client";
export {
  useBadgeModelUploader,
  applyBadgeModelPoseSessionToForm,
  clearBadgeModelPoseSessionRef,
  type BadgeModelUploadStaged,
} from "./upload/model/use-badge-model-uploader";

export { ImpressionGlitterField } from "./effects/impression-glitter-field";
export { ImpressionBurst } from "./effects/impression-burst";
export { UnlockRevealWave } from "./effects/unlock-reveal-wave";
export { DedicatedBadgeGlitter } from "./effects/dedicated-badge-glitter";

export {
  DetailBadgeInteractive,
  type DetailBadgeInteractiveProps,
} from "../detail/detail-badge-interactive";

export { BadgeEditor } from "./editor/badge-editor";

export {
  beginRemoteAssetStorageSession,
  clearSessionStagedUpload,
  setSessionStagedUpload,
  deleteRemoteAssetStorageRefQuietly,
  getReplacedRemoteAssetStorageRef,
  rollbackBadgeUploadSession,
} from "./upload/badge-asset-session";
export { normalizeImageKitFileId } from "@/lib/imagekit/client/imagekit-api";
export { useBadgeImageUploader } from "./upload/image/use-badge-image-uploader";

export { useBadgeMetricsController } from "./hooks/use-badge-metrics-controller";
export { useBadgeChunkedPrewarm } from "./hooks/use-badge-chunked-prewarm";

export { submitImpression } from "./effects/use-impression-on-badge";
export type { ImpressionResult } from "./effects/use-impression-on-badge";

export {
  useBadgeSessionController,
  type BadgeSessionController,
} from "./upload/use-badge-session-controller";
