"use client";

import { parseGltfFile } from "@/lib/achievements/badge/model/load/load-gltf";
import { renderBadgeModelPosterFromGltf } from "@/lib/achievements/badge/model/poster-snapshot";

export type PreparedBadgeModelUpload = {
  initialPreviewBlob: Blob;
  initialPreviewUrl: string;
  initialYaw: number;
  initialPitch: number;
  createPreviewBlob: (yaw: number, pitch: number) => Promise<Blob>;
};

export async function prepareBadgeModelUpload(
  file: File,
): Promise<PreparedBadgeModelUpload> {
  const gltf = await parseGltfFile(file);

  const initialYaw = 0;
  const initialPitch = 0;
  const initialPreviewBlob = await renderBadgeModelPosterFromGltf(
    gltf,
    initialYaw,
    initialPitch,
  );
  const initialPreviewUrl = URL.createObjectURL(initialPreviewBlob);

  return {
    initialPreviewBlob,
    initialPreviewUrl,
    initialYaw,
    initialPitch,
    createPreviewBlob: (yaw, pitch) => renderBadgeModelPosterFromGltf(gltf, yaw, pitch),
  };
}
