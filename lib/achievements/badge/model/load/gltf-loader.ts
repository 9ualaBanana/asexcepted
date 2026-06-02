import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** Draco WASM decoders (geometry compression in GLB). */
export const BADGE_MODEL_DRACO_DECODER_CDN =
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

export async function withConfiguredGltfLoader<T>(
  run: (loader: GLTFLoader) => Promise<T>,
): Promise<T> {
  using scope = createConfiguredGltfLoader();
  return run(scope.loader);
}

type ConfiguredGltfLoader = Disposable & {
  loader: GLTFLoader;
};

function createConfiguredGltfLoader(): ConfiguredGltfLoader {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  configureGltfLoader(loader, dracoLoader);
  return {
    loader,
    [Symbol.dispose]: () => dracoLoader.dispose(),
  };
}

/**
 * Enables Draco + Meshopt on a GLTFLoader.
 * KHR_lights_punctual and material extensions (transmission, dispersion,
 * emissive_strength, etc.) are registered by Three.js GLTFLoader itself.
 */
function configureGltfLoader(
  loader: GLTFLoader,
  dracoLoader: DRACOLoader,
): void {
  dracoLoader.setDecoderPath(BADGE_MODEL_DRACO_DECODER_CDN);
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);
}