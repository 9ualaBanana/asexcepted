import {
  ACESFilmicToneMapping,
  AnimationMixer,
  Group,
  LoopRepeat,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  type Texture,
  type WebGLRenderer,
} from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { applyBadgeModelPose } from "@/lib/achievements/badge-model-poses";
import {
  centerBadgeModelAtOrigin,
  frameCameraForBadgeModel,
} from "@/lib/achievements/badge-model-rendering";

/** Same exposure for live R3F viewers and poster snapshots. */
export const BADGE_MODEL_TONE_MAPPING_EXPOSURE = 1;

/** Fixed IBL strength (matches Drei Environment environmentIntensity). */
export const BADGE_MODEL_ENVIRONMENT_INTENSITY = 1;

/** Poly Haven studio HDRI — close to Drei `preset="studio"`. */
const BADGE_MODEL_STUDIO_HDR_URL =
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr";

export const BADGE_MODEL_CAMERA_FOV = 34;

let sharedStudioEnvironmentMap: Texture | null = null;
let studioEnvironmentLoadPromise: Promise<Texture> | null = null;

export function configureBadgeModelRenderer(renderer: WebGLRenderer): void {
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = BADGE_MODEL_TONE_MAPPING_EXPOSURE;
}

export async function getBadgeModelStudioEnvironment(
  renderer: WebGLRenderer,
): Promise<Texture> {
  if (sharedStudioEnvironmentMap) {
    return sharedStudioEnvironmentMap;
  }

  if (!studioEnvironmentLoadPromise) {
    studioEnvironmentLoadPromise = new RGBELoader()
      .loadAsync(BADGE_MODEL_STUDIO_HDR_URL)
      .then((hdrTexture) => {
        const pmremGenerator = new PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
        hdrTexture.dispose();
        pmremGenerator.dispose();
        sharedStudioEnvironmentMap = envMap;
        return envMap;
      })
      .catch((error) => {
        studioEnvironmentLoadPromise = null;
        throw error;
      });
  }

  return studioEnvironmentLoadPromise;
}

export async function applyBadgeModelEnvironment(
  scene: Scene,
  renderer: WebGLRenderer,
): Promise<void> {
  configureBadgeModelRenderer(renderer);
  scene.environment = await getBadgeModelStudioEnvironment(renderer);
  scene.environmentIntensity = BADGE_MODEL_ENVIRONMENT_INTENSITY;
}

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
  const model = cloneSkeleton(gltf.scene) as Group;
  centerBadgeModelAtOrigin(model);

  const orbitRoot = new Group();
  orbitRoot.add(model);
  applyBadgeModelPose(orbitRoot, yaw, pitch);

  const camera = new PerspectiveCamera(BADGE_MODEL_CAMERA_FOV, 1, 0.01, 1000);
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

export function renderBadgeModelFrame(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  mixer: AnimationMixer | null,
  deltaSeconds: number,
): void {
  if (mixer && deltaSeconds > 0) {
    mixer.update(deltaSeconds);
  }
  renderer.render(scene, camera);
}
