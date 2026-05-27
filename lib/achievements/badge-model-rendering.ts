import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  DirectionalLight,
  Mesh,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  type Texture,
  Vector3,
  type WebGLRenderer,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export const BADGE_MODEL_DRACO_DECODER_CDN =
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

/** Slightly above 1.0 so PBR albedo reads closer to authored / showcase viewers. */
export const BADGE_MODEL_TONE_MAPPING_EXPOSURE = 1.2;

export const BADGE_MODEL_ENVIRONMENT_INTENSITY = 1;

let sharedBadgeEnvironmentMap: Texture | null = null;

/** AABB center is far outside its own extent (e.g. many dots on a large spherical shell). */
const SHELL_PIVOT_OFFSET_RATIO = 8;
/** Vertex distances from the shell center are nearly uniform. */
const SHELL_MAX_RADIUS_CV = 0.06;
/** Shell radius is clearly larger than the tight local cluster AABB. */
const SHELL_MIN_MEAN_RADIUS_RATIO = 2;

const _sampleVertex = new Vector3();

export function configureBadgeModelLoader(loader: GLTFLoader) {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(BADGE_MODEL_DRACO_DECODER_CDN);
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return dracoLoader;
}

export function configureBadgeModelRenderer(renderer: WebGLRenderer): void {
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = BADGE_MODEL_TONE_MAPPING_EXPOSURE;
}

export function getSharedBadgeModelEnvironment(renderer: WebGLRenderer): Texture {
  if (sharedBadgeEnvironmentMap) {
    return sharedBadgeEnvironmentMap;
  }

  const pmremGenerator = new PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  sharedBadgeEnvironmentMap = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
  pmremGenerator.dispose();
  return sharedBadgeEnvironmentMap;
}

export function setupBadgeModelScene(scene: Scene, renderer: WebGLRenderer): void {
  scene.environment = getSharedBadgeModelEnvironment(renderer);
  scene.environmentIntensity = BADGE_MODEL_ENVIRONMENT_INTENSITY;
  addBadgeModelLights(scene);
}

export function addBadgeModelLights(scene: Scene) {
  const ambientLight = new AmbientLight(0xffffff, 0.55);
  const keyLight = new DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(6, 8, 10);
  const fillLight = new DirectionalLight(0xc7d2fe, 1.4);
  fillLight.position.set(-8, 4, 6);
  const rimLight = new DirectionalLight(0xfff4e6, 0.9);
  rimLight.position.set(0, 2, -8);
  scene.add(ambientLight, keyLight, fillLight, rimLight);
}

export type BadgeModelFrameMetrics = {
  size: Vector3;
  maxDim: number;
};

type RadiusStats = {
  mean: number;
  cv: number;
};

type BadgeModelGeometryAnalysis = {
  size: Vector3;
  aabbMaxDim: number;
  pivot: Vector3;
  frameMaxDim: number;
};

function collectBadgeModelVertices(root: Object3D): Vector3[] {
  const points: Vector3[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const position = object.geometry.attributes.position;
    if (!position) return;

    object.updateWorldMatrix(true, false);
    for (let index = 0; index < position.count; index += 1) {
      _sampleVertex.fromBufferAttribute(position, index);
      object.localToWorld(_sampleVertex);
      points.push(_sampleVertex.clone());
    }
  });
  return points;
}

function getRadiusStats(points: Vector3[], center: Vector3): RadiusStats | null {
  if (points.length === 0) return null;

  let sum = 0;
  let sumSq = 0;
  for (const point of points) {
    const radius = point.distanceTo(center);
    sum += radius;
    sumSq += radius * radius;
  }

  const mean = sum / points.length;
  if (mean <= 1e-6) return null;

  const variance = Math.max(sumSq / points.length - mean * mean, 0);
  return { mean, cv: Math.sqrt(variance) / mean };
}

function isSphericalShellAround(points: Vector3[], center: Vector3, aabbMaxDim: number): boolean {
  const stats = getRadiusStats(points, center);
  if (!stats) return false;

  return stats.cv <= SHELL_MAX_RADIUS_CV && stats.mean >= aabbMaxDim * SHELL_MIN_MEAN_RADIUS_RATIO;
}

function resolveBadgeModelPivot(
  aabbCenter: Vector3,
  aabbMaxDim: number,
  points: Vector3[],
): Vector3 {
  const offsetFromOrigin = aabbCenter.length();
  if (
    points.length > 0 &&
    aabbMaxDim > 0 &&
    offsetFromOrigin > aabbMaxDim * SHELL_PIVOT_OFFSET_RATIO &&
    isSphericalShellAround(points, new Vector3(0, 0, 0), aabbMaxDim)
  ) {
    return new Vector3(0, 0, 0);
  }

  return aabbCenter.clone();
}

function resolveBadgeModelFrameMaxDim(
  aabbMaxDim: number,
  pivot: Vector3,
  points: Vector3[],
): number {
  if (pivot.lengthSq() > 1e-8 || points.length === 0) {
    return aabbMaxDim || 1;
  }

  const shell = getRadiusStats(points, pivot);
  if (!shell || shell.cv > SHELL_MAX_RADIUS_CV) {
    return aabbMaxDim || 1;
  }

  return Math.max(aabbMaxDim || 1, shell.mean * 2);
}

function analyzeBadgeModelGeometry(model: Object3D): BadgeModelGeometryAnalysis {
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  if (box.isEmpty()) {
    throw new Error("This GLB does not contain any renderable geometry.");
  }

  const size = box.getSize(new Vector3());
  const aabbMaxDim = Math.max(size.x, size.y, size.z) || 1;
  const aabbCenter = box.getCenter(new Vector3());
  const points = collectBadgeModelVertices(model);
  const pivot = resolveBadgeModelPivot(aabbCenter, aabbMaxDim, points);
  const frameMaxDim = resolveBadgeModelFrameMaxDim(aabbMaxDim, pivot, points);

  return { size, aabbMaxDim, pivot, frameMaxDim };
}

/**
 * Moves the model so the orbit pivot sits at the origin.
 * Uses the AABB center for typical meshes; keeps world origin for large spherical
 * shells whose local cluster AABB sits on the surface (e.g. dotted spheres).
 */
export function centerBadgeModelAtOrigin(model: Object3D): BadgeModelFrameMetrics {
  const analysis = analyzeBadgeModelGeometry(model);
  model.position.sub(analysis.pivot);
  model.updateMatrixWorld(true);

  return { size: analysis.size, maxDim: analysis.frameMaxDim };
}

/**
 * Positions the camera to frame `target` without changing `target.position`.
 * Use after centerBadgeModelAtOrigin on the inner mesh and pose on a parent group at (0,0,0).
 */
export function frameCameraForBadgeModel(
  target: Object3D,
  camera: PerspectiveCamera,
): BadgeModelFrameMetrics {
  const analysis = analyzeBadgeModelGeometry(target);
  const frameMaxDim = analysis.frameMaxDim;

  const distance = frameMaxDim * 2.35;
  camera.position.set(
    frameMaxDim * 0.34,
    Math.max(analysis.size.y * 0.22, frameMaxDim * 0.2),
    distance,
  );
  camera.near = Math.max(distance / 200, 0.01);
  camera.far = distance * 12;
  camera.lookAt(0, Math.max(analysis.size.y * 0.05, 0), 0);
  camera.updateProjectionMatrix();

  return { size: analysis.size, maxDim: frameMaxDim };
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
