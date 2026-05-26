import "server-only";

import {
  ACHIEVEMENT_BADGE_MODEL_BUCKET,
  ACHIEVEMENT_BADGE_PREVIEW_BUCKET,
  BADGE_PREVIEW_MAX_FILE_BYTES,
  buildAchievementBadgeModelPath,
  buildAchievementBadgePreviewPath,
  extractPublicBucketObjectPath,
  sanitizeAchievementBadgeAssetPath,
} from "@/lib/achievements/badge-assets";
import { getImageKitServerClient, isImageKitServerConfigured } from "@/lib/imagekit/server-client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type UploadAchievementBadgeModelAssetArgs = {
  userId: string;
  modelBuffer: ArrayBuffer;
  previewBuffer: ArrayBuffer;
};

export async function uploadAchievementBadgeModelAsset(args: UploadAchievementBadgeModelAssetArgs) {
  const supabase = createServiceRoleClient();
  const assetId = crypto.randomUUID();
  const modelPath = buildAchievementBadgeModelPath(args.userId, assetId);
  const previewPath = buildAchievementBadgePreviewPath(args.userId, assetId);

  const modelUpload = await supabase.storage
    .from(ACHIEVEMENT_BADGE_MODEL_BUCKET)
    .upload(modelPath, args.modelBuffer, {
      cacheControl: "3600",
      contentType: "model/gltf-binary",
      upsert: false,
    });

  if (modelUpload.error) {
    throw new Error(modelUpload.error.message);
  }

  const previewUpload = await supabase.storage
    .from(ACHIEVEMENT_BADGE_PREVIEW_BUCKET)
    .upload(previewPath, args.previewBuffer, {
      cacheControl: "31536000",
      contentType: "image/png",
      upsert: false,
    });

  if (previewUpload.error) {
    await supabase.storage.from(ACHIEVEMENT_BADGE_MODEL_BUCKET).remove([modelPath]);
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
