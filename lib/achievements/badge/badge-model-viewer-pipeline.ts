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
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { applyBadgeModelPose } from "@/lib/achievements/badge/badge-model-poses";
import {
  centerBadgeModelAtOrigin,
  frameCameraForBadgeModel,
} from "@/lib/achievements/badge/badge-model-rendering";

/**
 * Live badge viewers use Drei `<Environment preset="studio" />` inside R3F
 * (`badge-model-scene.tsx`). Poster snapshots use a plain `Scene` + offscreen
 * `WebGLRenderer` with no React tree, so Drei's component cannot run there.
 * We load the same kind of studio HDRI manually and bake it with PMREM so
 * IBL matches as closely as possible. Set `NEXT_PUBLIC_BADGE_MODEL_STUDIO_HDR_URL`
 * to point at another HDR if you need parity with a specific Drei preset asset.
 */

let sharedStudioEnvironmentMap: Texture | null = null;
let studioEnvironmentLoadPromise: Promise<Texture> | null = null;

export function configureBadgeModelRenderer(renderer: WebGLRenderer): void {
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = Number(
    process.env.NEXT_PUBLIC_BADGE_MODEL_TONE_MAPPING_EXPOSURE,
  );
}

export async function getBadgeModelStudioEnvironment(
  renderer: WebGLRenderer,
): Promise<Texture> {
  if (sharedStudioEnvironmentMap) {
    return sharedStudioEnvironmentMap;
  }

  if (!studioEnvironmentLoadPromise) {
    let hdrTexture: Texture | null = null;
    let pmremGenerator: PMREMGenerator | null = null;

    const hdrUrl =
      process.env.NEXT_PUBLIC_BADGE_MODEL_STUDIO_HDR_URL?.trim() ||
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr";

    studioEnvironmentLoadPromise = new HDRLoader()
      .loadAsync(hdrUrl)
      .then((hdr) => {
        hdrTexture = hdr;
        pmremGenerator = new PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const envMap = pmremGenerator.fromEquirectangular(hdr).texture;
        sharedStudioEnvironmentMap = envMap;
        return envMap;
      })
      .catch((error) => {
        studioEnvironmentLoadPromise = null;
        throw error;
      })
      .finally(() => {
        hdrTexture?.dispose();
        pmremGenerator?.dispose();
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
  scene.environmentIntensity = Number(
    process.env.NEXT_PUBLIC_BADGE_MODEL_ENVIRONMENT_INTENSITY,
  );
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

  const camera = new PerspectiveCamera(
    Number(process.env.NEXT_PUBLIC_BADGE_MODEL_CAMERA_FOV),
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
