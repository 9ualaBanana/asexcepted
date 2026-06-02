import {
  ACESFilmicToneMapping,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  type Texture,
  type WebGLRenderer,
} from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

import { badgeModelConfig } from "@/lib/achievements/badge/model/badge-model-config";

/**
 * Live badge viewers use Drei `<Environment preset="studio" />` inside R3F
 * (`badge-model-scene.tsx`). Poster snapshots use a plain `Scene` + offscreen
 * `WebGLRenderer` with no React tree, so Drei's component cannot run there.
 * We load the same kind of studio HDRI manually and bake it with PMREM so
 * IBL matches as closely as possible. Override `badgeModelConfig.environment.studioHdrUrl`
 * via `NEXT_PUBLIC_BADGE_MODEL_STUDIO_HDR_URL` for Drei preset parity.
 */

let sharedStudioEnvironmentMap: Texture | null = null;
let studioEnvironmentLoadPromise: Promise<Texture> | null = null;

export async function applyBadgeModelEnvironment(
  scene: Scene,
  renderer: WebGLRenderer,
): Promise<void> {
  configureBadgeModelRenderer(renderer);
  scene.environment = await getBadgeModelStudioEnvironment(renderer);
  scene.environmentIntensity = badgeModelConfig.environment.intensity;
}

export function configureBadgeModelRenderer(renderer: WebGLRenderer): void {
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = badgeModelConfig.renderer.toneMappingExposure;
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

    studioEnvironmentLoadPromise = new HDRLoader()
      .loadAsync(badgeModelConfig.environment.studioHdrUrl)
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
