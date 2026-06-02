import { type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  isGlbHeader,
  looksLikeGlbUpload,
  BADGE_MODEL_MAX_FILE_BYTES,
} from "@/lib/achievements/badge/shared/badge-assets";
import { withConfiguredGltfLoader } from "./gltf-loader";

export async function parseGltfFile(file: File): Promise<GLTF> {
  if (file.size > BADGE_MODEL_MAX_FILE_BYTES) {
    throw new Error("3D badge files must be 50 MB or smaller.");
  }
  if (!looksLikeGlbUpload(file.name, file.type)) {
    throw new Error("Only .glb uploads are supported for 3D badges.");
  }

  const arrayBuffer = await file.arrayBuffer();
  if (!isGlbHeader(arrayBuffer)) {
    throw new Error("This file is not a valid GLB asset.");
  }

  return withConfiguredGltfLoader(async (loader) => {
    try {
      return await loader.parseAsync(arrayBuffer, window.location.origin + "/");
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Could not read this GLB file.",
      );
    }
  });
}

export async function loadGltfFromUrl(url: string): Promise<GLTF> {
  return withConfiguredGltfLoader((loader) => loader.loadAsync(url));
}
