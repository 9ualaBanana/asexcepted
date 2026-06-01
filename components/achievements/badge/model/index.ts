/**
 * 3D GLB badge UI — viewer, live detail shell, upload, signed URLs.
 * Prefer importing from here or `@/components/achievements/badge`.
 */

export { BadgeModelViewer, type BadgeModelViewerProps } from "./badge-model-viewer";

export { BadgeModelLiveView, type BadgeModelLiveViewProps } from "./badge-model-live-view";

export {
  revokeBadgeModelPoseSession,
  type BadgeModelPoseSession,
} from "./upload/badge-model-pose-session";

export {
  prepareBadgeModelUpload,
  type PreparedBadgeModelUpload,
} from "./upload/badge-model-upload-client";

export {
  useBadgeModelUploader,
  applyBadgeModelPoseSessionToForm,
  clearBadgeModelPoseSessionRef,
  type BadgeModelUploadStaged,
} from "./upload/use-badge-model-uploader";

export { useSignedBadgeModelUrl } from "./hooks/use-signed-badge-model-url";
