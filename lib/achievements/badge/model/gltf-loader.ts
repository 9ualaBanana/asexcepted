import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/** Draco WASM decoders (geometry compression in GLB). */
export const BADGE_MODEL_DRACO_DECODER_CDN =
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

/**
 * Enables Draco + Meshopt on a GLTFLoader.
 * KHR_lights_punctual and material extensions (transmission, dispersion,
 * emissive_strength, etc.) are registered by Three.js GLTFLoader itself.
 * Returns the DracoLoader instance — dispose it when the loader is done.
 */
export function configureBadgeModelLoader(loader: GLTFLoader) {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(BADGE_MODEL_DRACO_DECODER_CDN);
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return dracoLoader;
}

export function createConfiguredBadgeGltfLoader() {
  const loader = new GLTFLoader();
  const dracoLoader = configureBadgeModelLoader(loader);
  return { loader, dracoLoader };
}
