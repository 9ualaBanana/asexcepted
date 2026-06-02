import {
  AnimationMixer,
  Group,
  LoopRepeat,
  type Object3D,
  PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { badgeModelConfig } from "@/lib/achievements/badge/model/badge-model-config";
import { applyBadgeModelGltfTuning } from "@/lib/achievements/badge/model/gltf-tuning";
import {
  centerBadgeModelAtOrigin,
  frameCameraForBadgeModel,
} from "@/lib/achievements/badge/model/rendering";

export type BadgeModelSceneGraph = {
  orbitRoot: Group;
  model: Group;
  camera: PerspectiveCamera;
  mixer: AnimationMixer | null;
};

export function buildBadgeModelSceneGraph(
  gltf: GLTF,
  yaw: number,
  pitch: number,
): BadgeModelSceneGraph {
  const model = prepareBadgeGltfRoot(gltf);

  const orbitRoot = new Group();
  orbitRoot.add(model);
  applyBadgeModelPose(orbitRoot, yaw, pitch);

  const camera = new PerspectiveCamera(
    badgeModelConfig.camera.fov,
    1,
    0.01,
    1000,
  );
  frameCameraForBadgeModel(orbitRoot, camera);

  let mixer: AnimationMixer | null = null;
  const firstClip = gltf.animations[0];
  if (firstClip) {
    mixer = new AnimationMixer(model);
    const action = mixer.clipAction(firstClip);
    action.setLoop(LoopRepeat, Infinity);
    action.play();
    mixer.setTime(0);
  }

  return { orbitRoot, model, camera, mixer };
}

export type PrepareBadgeGltfOptions = {
  tune?: {
    scene: Scene;
    renderer: WebGLRenderer;
  };
};

/** Clone glTF scene, center at orbit pivot, optionally apply material/light tuning. */
export function prepareBadgeGltfRoot(
  gltf: GLTF,
  options?: PrepareBadgeGltfOptions,
): Group {
  const model = cloneSkeleton(gltf.scene) as Group;
  centerBadgeModelAtOrigin(model);

  if (options?.tune) {
    applyBadgeModelGltfTuning(gltf, model, {
      scene: options.tune.scene,
      renderer: options.tune.renderer,
    });
  }

  return model;
}

export function applyBadgeModelPose(root: Object3D, yaw: number, pitch: number): void {
  root.rotation.set(pitch, yaw, 0, "YXZ");
}
