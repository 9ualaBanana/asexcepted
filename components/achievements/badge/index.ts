/** Public badge module surface — prefer importing from here. */

export { Badge } from "./display/badge";
export type {
  BadgeOptions,
  BadgeFrame,
  BadgeContent,
  BadgeUnlock,
  BadgeImpression,
} from "./display/badge-options";

export {
  badgeOptionsForGrid,
  badgeOptionsForFeedRow,
  badgeOptionsForDetailInteractive,
  badgeOptionsForEditor,
  badgeOptionsForEmbed,
  badgeOptionsForInvite,
  type DetailInteractiveBadgeOptionsParams,
} from "./display/badge-presets";

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
  type BadgeParallaxViewerProps,
} from "./display/parallax/badge-parallax-viewer";

export { BadgeGltfViewer, type BadgeGltfViewerProps } from "./display/gltf";
export { useSignedBadgeModelUrl } from "./display/gltf";

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

export { BadgeGlitterLayer } from "./display/badge-glitter-layer";
export { BadgeImpressionLayer } from "./display/badge-impression-layer";
export { ImpressionBurst } from "./effects/impression-burst";
export { UnlockRevealWave } from "./effects/unlock-reveal-wave";

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
