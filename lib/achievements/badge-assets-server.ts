import "server-only";

import {
  ACHIEVEMENT_BADGE_MODEL_BUCKET,
  ACHIEVEMENT_BADGE_PREVIEW_BUCKET,
  BADGE_MODEL_MAX_FILE_BYTES,
  BADGE_PREVIEW_MAX_FILE_BYTES,
  buildAchievementBadgeModelPath,
  buildAchievementBadgePreviewPath,
  extractPublicBucketObjectPath,
  isGlbHeader,
  sanitizeAchievementBadgeAssetPath,
} from "@/lib/achievements/badge-assets";
import { getImageKitServerClient, isImageKitServerConfigured } from "@/lib/imagekit/server-client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AchievementBadgeModelUploadTarget = {
  modelPath: string;
  token: string;
};

function assertUserOwnedBadgeModelPath(userId: string, modelPath: string): void {
  const normalized = sanitizeAchievementBadgeAssetPath(modelPath);
  if (!normalized.startsWith(`${userId}/`)) {
    throw new Error("Invalid badge model path.");
  }
  if (!/^[^/]+\/[^/]+\/badge\.glb$/.test(normalized)) {
    throw new Error("Invalid badge model path.");
  }
}

function previewPathForModelPath(userId: string, modelPath: string): string {
  const assetId = modelPath.split("/")[1];
  if (!assetId) {
    throw new Error("Invalid badge model path.");
  }
  return buildAchievementBadgePreviewPath(userId, assetId);
}

export async function createAchievementBadgeModelUploadTarget(
  userId: string,
): Promise<AchievementBadgeModelUploadTarget> {
  const supabase = createServiceRoleClient();
  const assetId = crypto.randomUUID();
  const modelPath = buildAchievementBadgeModelPath(userId, assetId);

  const { data, error } = await supabase.storage
    .from(ACHIEVEMENT_BADGE_MODEL_BUCKET)
    .createSignedUploadUrl(modelPath);

  if (error || !data?.token) {
    throw new Error(error?.message ?? "Could not create badge model upload URL.");
  }

  return {
    modelPath,
    token: data.token,
  };
}

type CompleteAchievementBadgeModelUploadArgs = {
  userId: string;
  modelPath: string;
  previewBuffer: ArrayBuffer;
};

export async function completeAchievementBadgeModelUpload(
  args: CompleteAchievementBadgeModelUploadArgs,
) {
  const modelPath = sanitizeAchievementBadgeAssetPath(args.modelPath);
  assertUserOwnedBadgeModelPath(args.userId, modelPath);

  if (isAchievementBadgePreviewTooLarge(args.previewBuffer)) {
    throw new Error("The generated badge preview is too large.");
  }

  const supabase = createServiceRoleClient();
  const { data: modelBlob, error: modelDownloadError } = await supabase.storage
    .from(ACHIEVEMENT_BADGE_MODEL_BUCKET)
    .download(modelPath);

  if (modelDownloadError || !modelBlob) {
    throw new Error("Badge model was not uploaded. Try uploading again.");
  }

  const modelBuffer = await modelBlob.arrayBuffer();
  if (!isGlbHeader(modelBuffer)) {
    await supabase.storage.from(ACHIEVEMENT_BADGE_MODEL_BUCKET).remove([modelPath]);
    throw new Error("This file is not a valid GLB asset.");
  }

  if (modelBuffer.byteLength > BADGE_MODEL_MAX_FILE_BYTES) {
    await supabase.storage.from(ACHIEVEMENT_BADGE_MODEL_BUCKET).remove([modelPath]);
    throw new Error("3D badge files must be 50 MB or smaller.");
  }

  const previewPath = previewPathForModelPath(args.userId, modelPath);
  const previewUpload = await supabase.storage
    .from(ACHIEVEMENT_BADGE_PREVIEW_BUCKET)
    .upload(previewPath, args.previewBuffer, {
      cacheControl: "31536000",
      contentType: "image/png",
      upsert: true,
    });

  if (previewUpload.error) {
    throw new Error(previewUpload.error.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from(ACHIEVEMENT_BADGE_PREVIEW_BUCKET)
    .getPublicUrl(previewPath);

  return {
    iconUrl: publicUrlData.publicUrl,
    iconAssetKind: "model_glb" as const,
    iconAssetPath: modelPath,
  };
}

export async function createSignedAchievementBadgeModelUrl(
  rawAssetPath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const assetPath = sanitizeAchievementBadgeAssetPath(rawAssetPath);
  if (!assetPath) {
    throw new Error("Missing badge model asset path.");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from(ACHIEVEMENT_BADGE_MODEL_BUCKET)
    .createSignedUrl(assetPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not sign badge model URL.");
  }

  return data.signedUrl;
}

export async function deleteAchievementBadgeRemoteAsset(args: {
  iconUrl?: string | null;
  iconFileId?: string | null;
  iconAssetPath?: string | null;
}) {
  const supabase = createServiceRoleClient();

  const previewPath = extractPublicBucketObjectPath(
    args.iconUrl,
    ACHIEVEMENT_BADGE_PREVIEW_BUCKET,
  );
  if (previewPath) {
    await supabase.storage.from(ACHIEVEMENT_BADGE_PREVIEW_BUCKET).remove([previewPath]);
  }

  const assetPath = sanitizeAchievementBadgeAssetPath(args.iconAssetPath);
  if (assetPath) {
    await supabase.storage.from(ACHIEVEMENT_BADGE_MODEL_BUCKET).remove([assetPath]);
  }

  const iconFileId = args.iconFileId?.trim() ?? "";
  if (iconFileId && isImageKitServerConfigured()) {
    await getImageKitServerClient().deleteFile(iconFileId);
  }
}

export function isAchievementBadgePreviewTooLarge(buffer: ArrayBuffer): boolean {
  return buffer.byteLength > BADGE_PREVIEW_MAX_FILE_BYTES;
}
