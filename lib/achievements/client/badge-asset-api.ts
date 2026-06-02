import { z } from "zod";

import { deleteJson, fetchJsonParsed, postJson } from "@/lib/client/fetch-json";

const badgeModelUploadTargetSchema = z.object({
  modelPath: z.string().min(1),
  token: z.string().min(1),
});

const badgeModelCompleteSchema = z.object({
  iconUrl: z.string().min(1),
  iconAssetKind: z.literal("model_glb"),
  iconAssetPath: z.string().min(1),
});

const signedBadgeModelUrlSchema = z.object({
  signedUrl: z.string().min(1),
});

export type BadgeModelUploadTarget = z.infer<typeof badgeModelUploadTargetSchema>;
export type BadgeModelUploadSuccess = z.infer<typeof badgeModelCompleteSchema>;

export async function requestBadgeModelUploadTarget() {
  return postJson(
    "/api/achievements/badge-model/upload-url",
    {},
    badgeModelUploadTargetSchema,
    "Invalid 3D badge upload preparation response.",
  );
}

export async function completeBadgeModelUpload(modelPath: string, poster: Blob) {
  const formData = new FormData();
  formData.set("modelPath", modelPath);
  formData.set("poster", poster, "badge-poster.png");

  return fetchJsonParsed(
    "/api/achievements/badge-model/complete",
    badgeModelCompleteSchema,
    { method: "POST", body: formData },
    "Invalid badge model upload response.",
  );
}

export async function deleteBadgeRemoteAssetViaApi(asset: {
  iconFileId: string;
  iconAssetPath: string;
  iconAssetKind: "image" | "model_glb";
}) {
  return deleteJson("/api/achievements/badge-asset", {
    iconFileId: asset.iconFileId,
    iconAssetPath: asset.iconAssetPath,
    iconAssetKind: asset.iconAssetKind,
  });
}

export async function requestSignedBadgeModelUrl(assetPath: string) {
  return postJson(
    "/api/achievements/badge-model-url",
    { assetPath },
    signedBadgeModelUrlSchema,
    "Badge model URL response was empty.",
  );
}
