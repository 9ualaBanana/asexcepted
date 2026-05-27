import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export const BADGE_MODEL_DRACO_DECODER_CDN =
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

export function configureBadgeModelLoader(loader: GLTFLoader) {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(BADGE_MODEL_DRACO_DECODER_CDN);
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return dracoLoader;
}

export function addBadgeModelLights(scene: Scene) {
  const ambientLight = new AmbientLight(0xffffff, 1.8);
  const keyLight = new DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(6, 8, 10);
  const fillLight = new DirectionalLight(0xc7d2fe, 1.1);
  fillLight.position.set(-8, 4, 6);
  scene.add(ambientLight, keyLight, fillLight);
}

export type BadgeModelFrameMetrics = {
  size: Vector3;
  maxDim: number;
};

/** Moves mesh geometry so its bounding-box center sits at the origin (orbit pivot). */
export function centerBadgeModelAtOrigin(model: Object3D): BadgeModelFrameMetrics {
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  if (box.isEmpty()) {
    throw new Error("This GLB does not contain any renderable geometry.");
  }

  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  model.position.sub(center);
  model.updateMatrixWorld(true);

  return { size, maxDim };
}

/**
 * Positions the camera to frame `target` without changing `target.position`.
 * Use after centerBadgeModelAtOrigin on the inner mesh and pose on a parent group at (0,0,0).
 */
export function frameCameraForBadgeModel(
  target: Object3D,
  camera: PerspectiveCamera,
): BadgeModelFrameMetrics {
  target.updateMatrixWorld(true);
  const box = new Box3().setFromObject(target);
  if (box.isEmpty()) {
    throw new Error("This GLB does not contain any renderable geometry.");
  }

  const size = box.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  const distance = maxDim * 2.35;
  camera.position.set(maxDim * 0.34, Math.max(size.y * 0.22, 0.22), distance);
  camera.near = Math.max(distance / 200, 0.01);
  camera.far = distance * 12;
  camera.lookAt(0, Math.max(size.y * 0.05, 0), 0);
  camera.updateProjectionMatrix();

  return { size, maxDim };
}

/** Centers the mesh then frames it (legacy single-node helper). */
export function frameBadgeModelForCamera(
  model: Object3D,
  camera: PerspectiveCamera,
): BadgeModelFrameMetrics {
  const metrics = centerBadgeModelAtOrigin(model);
  frameCameraForBadgeModel(model, camera);
  return metrics;
}
