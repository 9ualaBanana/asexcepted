export { badgeModelConfig } from "./badge-model-config";

export { applyBadgeModelGltfTuning, type BadgeModelGltfTuningProfile } from "./gltf-tuning";

export {
  frameBadgeModelForCamera,
  frameCameraForBadgeModel,
  type BadgeModelFrameMetrics,
} from "./rendering";

export {
  applyBadgeModelPose,
  buildBadgeModelSceneGraph,
  prepareBadgeGltfRoot,
  type BadgeModelSceneGraph,
  type PrepareBadgeGltfOptions,
} from "./scene-graph";

export {
  parseGltfFile as parseBadgeGltfFile,
  loadGltfFromUrl as loadBadgeGltfFromUrl,
} from "./load/load-gltf";

export { renderBadgeModelPosterFromGltf } from "./poster-snapshot";
export {
  applyBadgeModelEnvironment,
  configureBadgeModelRenderer,
} from "./studio-environment";

export {
  clampBadgeAnimationSpeed,
  pickPrimaryAnimationClip,
  scheduleBadgeVisualReady,
} from "./badge-model-animation";

export {
  badgeModelViewStateStore,
  type BadgeModelViewState,
} from "./view-state";
