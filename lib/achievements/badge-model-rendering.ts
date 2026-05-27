import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  type Material,
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

/** Bright showcase exposure (Sketchfab-style viewers default high). */
export const BADGE_MODEL_TONE_MAPPING_EXPOSURE = 1.75;

/** IBL strength; primary light source for PBR badges. */
export const BADGE_MODEL_ENVIRONMENT_INTENSITY = 2.35;

const BADGE_MODEL_ENV_CACHE_KEY = 2;

/** Particle / halo materials exported with very low opacity. */
const GLOW_PARTICLE_OPACITY_MAX = 0.22;
const GLOW_PARTICLE_LUMINANCE_MIN = 0.82;
const GLOW_EMISSIVE_INTENSITY_CAP = 10;

let sharedBadgeEnvironmentMap: Texture | null = null;
let sharedBadgeEnvironmentCacheKey = 0;

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

function getColorLuminance(color: Color): number {
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
}

function isGlowParticleMaterial(material: MeshStandardMaterial): boolean {
  const opacity = material.opacity ?? 1;
  if (!material.transparent || opacity > GLOW_PARTICLE_OPACITY_MAX) {
    return false;
  }
  if (
    material instanceof MeshPhysicalMaterial &&
    (material.transmission ?? 0) > 0.05
  ) {
    return false;
  }
  return getColorLuminance(material.color) >= GLOW_PARTICLE_LUMINANCE_MIN;
}

function prepareBadgeModelMaterial(material: Material): void {
  if (!(material instanceof MeshStandardMaterial)) {
    return;
  }

  material.envMapIntensity = Math.max(material.envMapIntensity ?? 1, 2.25);
  material.needsUpdate = true;

  if (isGlowParticleMaterial(material)) {
    const opacity = Math.max(material.opacity ?? 1, 0.01);
    material.emissive.copy(material.color);
    material.emissiveIntensity = Math.min(GLOW_EMISSIVE_INTENSITY_CAP, 1.8 / opacity);
    material.opacity = 1;
    material.transparent = false;
    material.depthWrite = true;
    material.roughness = Math.min(material.roughness ?? 1, 0.28);
    material.metalness = 0;
    return;
  }

  if (material.transparent && (material.opacity ?? 1) < 0.92) {
    material.opacity = Math.min(1, (material.opacity ?? 1) * 3.5);
    material.depthWrite = (material.opacity ?? 1) >= 0.98;
  }

  if (getColorLuminance(material.emissive) > 0.01) {
    material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 1, 1.75);
  }
}

/**
 * Tunes imported glTF materials for our showcase viewer (closer to Sketchfab defaults).
 * Very faint white particles become bright emissive dots; other PBR gets stronger IBL response.
 */
export function prepareBadgeModelMaterials(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      prepareBadgeModelMaterial(material);
    }
  });
}

export function getSharedBadgeModelEnvironment(renderer: WebGLRenderer): Texture {
  if (sharedBadgeEnvironmentMap && sharedBadgeEnvironmentCacheKey === BADGE_MODEL_ENV_CACHE_KEY) {
    return sharedBadgeEnvironmentMap;
  }

  sharedBadgeEnvironmentMap?.dispose();
  sharedBadgeEnvironmentMap = null;
  sharedBadgeEnvironmentCacheKey = BADGE_MODEL_ENV_CACHE_KEY;

  const pmremGenerator = new PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  sharedBadgeEnvironmentMap = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
  pmremGenerator.dispose();
  return sharedBadgeEnvironmentMap;
}

export function setupBadgeModelScene(scene: Scene, renderer: WebGLRenderer): void {
  configureBadgeModelRenderer(renderer);
  scene.environment = getSharedBadgeModelEnvironment(renderer);
  scene.environmentIntensity = BADGE_MODEL_ENVIRONMENT_INTENSITY;
  addBadgeModelLights(scene);
}

/** IBL-forward rig similar to Sketchfab (environment does most of the work). */
export function addBadgeModelLights(scene: Scene) {
  const hemi = new HemisphereLight(0xffffff, 0x45455a, 0.85);
  const keyLight = new DirectionalLight(0xffffff, 1.45);
  keyLight.position.set(5, 8, 9);
  const rimLight = new DirectionalLight(0xfff6eb, 0.95);
  rimLight.position.set(-7, 3, -7);
  scene.add(hemi, keyLight, rimLight);
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
