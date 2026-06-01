/** GLB badge pipeline (load, frame, poster render, orbit pose). */

export {
  BADGE_MODEL_DRACO_DECODER_CDN,
  configureBadgeModelLoader,
  createConfiguredBadgeGltfLoader,
} from "./gltf-loader";

export { applyBadgeModelGltfTuning, type BadgeModelGltfTuningProfile } from "./gltf-tuning";

export {
  centerBadgeModelAtOrigin,
  frameBadgeModelForCamera,
  frameCameraForBadgeModel,
  type BadgeModelFrameMetrics,
} from "./rendering";

export {
  applyBadgeModelEnvironment,
  applyBadgeModelPose,
  buildBadgeModelSceneGraph,
  configureBadgeModelRenderer,
  renderBadgeModelFrame,
  type BadgeModelSceneGraph,
} from "./viewer-pipeline";

export { badgeModelViewStateCache, type BadgeModelViewState } from "./view-state";
