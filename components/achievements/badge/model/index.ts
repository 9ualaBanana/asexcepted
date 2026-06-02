/**
 * 3D GLB badge UI — GLTF viewer, upload, signed URLs.
 * Prefer importing from here or `@/components/achievements/badge`.
 */

export { BadgeGltfViewer, type BadgeGltfViewerProps } from "./badge-gltf-viewer";

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
