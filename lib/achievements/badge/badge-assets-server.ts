import "server-only";

import {
  BADGE_MODEL_BUCKET,
  BADGE_PREVIEW_BUCKET,
  BADGE_MODEL_MAX_FILE_BYTES,
  BADGE_PREVIEW_MAX_FILE_BYTES,
  buildBadgeModelPath,
  buildBadgePreviewPath,
  buildShareInviteBadgeModelPath,
  buildShareInviteBadgePreviewPath,
  extractPublicBucketObjectPath,
  isGlbHeader,
  isModelBadgeAssetKind,
  isShareInviteBadgeModelPath,
  sanitizeBadgeAssetPath,
} from "@/lib/achievements/badge/badge-assets";
import { getImageKitServerClient, isImageKitServerConfigured } from "@/lib/imagekit/server-client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type BadgeModelUploadTarget = {
  modelPath: string;
  token: string;
};

function assertUserOwnedBadgeModelPath(userId: string, modelPath: string): void {
  const normalized = sanitizeBadgeAssetPath(modelPath);
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
  return buildBadgePreviewPath(userId, assetId);
}

export async function createBadgeModelUploadTarget(
  userId: string,
): Promise<BadgeModelUploadTarget> {
  const supabase = createServiceRoleClient();
  const assetId = crypto.randomUUID();
  const modelPath = buildBadgeModelPath(userId, assetId);

  const { data, error } = await supabase.storage
    .from(BADGE_MODEL_BUCKET)
    .createSignedUploadUrl(modelPath);

  if (error || !data?.token) {
    throw new Error(error?.message ?? "Could not create badge model upload URL.");
  }

  return {
    modelPath,
    token: data.token,
  };
}

type CompleteBadgeModelUploadArgs = {
  userId: string;
  modelPath: string;
  previewBuffer: ArrayBuffer;
};

export async function completeBadgeModelUpload(
  args: CompleteBadgeModelUploadArgs,
) {
  const modelPath = sanitizeBadgeAssetPath(args.modelPath);
  assertUserOwnedBadgeModelPath(args.userId, modelPath);

  if (isBadgePreviewTooLarge(args.previewBuffer)) {
    throw new Error("The generated badge preview is too large.");
  }

  const supabase = createServiceRoleClient();
  const { data: modelBlob, error: modelDownloadError } = await supabase.storage
    .from(BADGE_MODEL_BUCKET)
    .download(modelPath);

  if (modelDownloadError || !modelBlob) {
    throw new Error("Badge model was not uploaded. Try uploading again.");
  }

  const modelBuffer = await modelBlob.arrayBuffer();
  if (!isGlbHeader(modelBuffer)) {
    await supabase.storage.from(BADGE_MODEL_BUCKET).remove([modelPath]);
    throw new Error("This file is not a valid GLB asset.");
  }

  if (modelBuffer.byteLength > BADGE_MODEL_MAX_FILE_BYTES) {
    await supabase.storage.from(BADGE_MODEL_BUCKET).remove([modelPath]);
    throw new Error("3D badge files must be 50 MB or smaller.");
  }

  const previewPath = previewPathForModelPath(args.userId, modelPath);
  const previewUpload = await supabase.storage
    .from(BADGE_PREVIEW_BUCKET)
    .upload(previewPath, args.previewBuffer, {
      cacheControl: "31536000",
      contentType: "image/png",
      upsert: true,
    });

  if (previewUpload.error) {
    throw new Error(previewUpload.error.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BADGE_PREVIEW_BUCKET)
    .getPublicUrl(previewPath);

  return {
    iconUrl: publicUrlData.publicUrl,
    iconAssetKind: "model_glb" as const,
    iconAssetPath: modelPath,
  };
}

export async function createSignedBadgeModelUrl(
  rawAssetPath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const assetPath = sanitizeBadgeAssetPath(rawAssetPath);
  if (!assetPath) {
    throw new Error("Missing badge model asset path.");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from(BADGE_MODEL_BUCKET)
    .createSignedUrl(assetPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not sign badge model URL.");
  }

  return data.signedUrl;
}

export async function deleteBadgeRemoteAsset(args: {
  iconUrl?: string | null;
  iconFileId?: string | null;
  iconAssetPath?: string | null;
}) {
  const supabase = createServiceRoleClient();

  const previewPath = extractPublicBucketObjectPath(
    args.iconUrl,
    BADGE_PREVIEW_BUCKET,
  );
  if (previewPath) {
    await supabase.storage.from(BADGE_PREVIEW_BUCKET).remove([previewPath]);
  }

  const assetPath = sanitizeBadgeAssetPath(args.iconAssetPath);
  if (assetPath) {
    await supabase.storage.from(BADGE_MODEL_BUCKET).remove([assetPath]);
  }

  const iconFileId = args.iconFileId?.trim() ?? "";
  if (iconFileId && isImageKitServerConfigured()) {
    await getImageKitServerClient().deleteFile(iconFileId);
  }
}

export function isBadgePreviewTooLarge(buffer: ArrayBuffer): boolean {
  return buffer.byteLength > BADGE_PREVIEW_MAX_FILE_BYTES;
}

export type ClonedBadgeModelAsset = {
  iconUrl: string;
  iconAssetPath: string;
};

type BadgeModelBundle = {
  modelBuffer: ArrayBuffer;
  previewBuffer: ArrayBuffer;
};

function resolveSourcePreviewPath(
  modelPath: string,
  ownerUserId: string,
): string {
  if (isShareInviteBadgeModelPath(modelPath)) {
    return buildShareInviteBadgePreviewPath(modelPath.split("/")[1] ?? "");
  }
  return previewPathForModelPath(ownerUserId, modelPath);
}

async function downloadBadgeModelBundle(args: {
  modelPath: string;
  ownerUserId: string;
}): Promise<BadgeModelBundle> {
  const sourceModelPath = sanitizeBadgeAssetPath(args.modelPath);
  if (!sourceModelPath) {
    throw new Error("Missing badge model asset path.");
  }

  if (!isShareInviteBadgeModelPath(sourceModelPath)) {
    assertUserOwnedBadgeModelPath(args.ownerUserId, sourceModelPath);
  }

  const supabase = createServiceRoleClient();
  const { data: modelBlob, error: modelDownloadError } = await supabase.storage
    .from(BADGE_MODEL_BUCKET)
    .download(sourceModelPath);

  if (modelDownloadError || !modelBlob) {
    throw new Error("Could not read the badge model.");
  }

  const modelBuffer = await modelBlob.arrayBuffer();
  if (!isGlbHeader(modelBuffer)) {
    throw new Error("The badge model is invalid.");
  }
  if (modelBuffer.byteLength > BADGE_MODEL_MAX_FILE_BYTES) {
    throw new Error("The badge model is too large.");
  }

  const previewPath = resolveSourcePreviewPath(sourceModelPath, args.ownerUserId);
  const { data: previewBlob, error: previewDownloadError } = await supabase.storage
    .from(BADGE_PREVIEW_BUCKET)
    .download(previewPath);

  if (previewDownloadError || !previewBlob) {
    throw new Error("Could not read the badge preview.");
  }

  const previewBuffer = await previewBlob.arrayBuffer();
  if (isBadgePreviewTooLarge(previewBuffer)) {
    throw new Error("The badge preview is too large.");
  }

  return { modelBuffer, previewBuffer };
}

async function uploadBadgeModelBundle(args: {
  modelPath: string;
  previewPath: string;
  modelBuffer: ArrayBuffer;
  previewBuffer: ArrayBuffer;
  upsert: boolean;
}): Promise<ClonedBadgeModelAsset> {
  const supabase = createServiceRoleClient();

  const modelUpload = await supabase.storage
    .from(BADGE_MODEL_BUCKET)
    .upload(args.modelPath, args.modelBuffer, {
      cacheControl: "31536000",
      contentType: "model/gltf-binary",
      upsert: args.upsert,
    });
  if (modelUpload.error) {
    throw new Error(modelUpload.error.message);
  }

  const previewUpload = await supabase.storage
    .from(BADGE_PREVIEW_BUCKET)
    .upload(args.previewPath, args.previewBuffer, {
      cacheControl: "31536000",
      contentType: "image/png",
      upsert: args.upsert,
    });
  if (previewUpload.error) {
    await supabase.storage.from(BADGE_MODEL_BUCKET).remove([args.modelPath]);
    throw new Error(previewUpload.error.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BADGE_PREVIEW_BUCKET)
    .getPublicUrl(args.previewPath);

  return {
    iconUrl: publicUrlData.publicUrl,
    iconAssetPath: args.modelPath,
  };
}

/**
 * Pins 3D badge files on the invite snapshot so links keep working if the sender
 * removes the achievement from their collection.
 */
export async function pinBadgeAssetsForShareInvite(args: {
  inviteId: string;
  senderUserId: string;
  iconAssetPath: string | null;
}): Promise<ClonedBadgeModelAsset | null> {
  const sourceModelPath = sanitizeBadgeAssetPath(args.iconAssetPath);
  if (!sourceModelPath) {
    return null;
  }

  const bundle = await downloadBadgeModelBundle({
    modelPath: sourceModelPath,
    ownerUserId: args.senderUserId,
  });

  return uploadBadgeModelBundle({
    modelPath: buildShareInviteBadgeModelPath(args.inviteId),
    previewPath: buildShareInviteBadgePreviewPath(args.inviteId),
    modelBuffer: bundle.modelBuffer,
    previewBuffer: bundle.previewBuffer,
    upsert: true,
  });
}

/**
 * Copies a badge GLB + poster into the claimer's storage so claimed achievements
 * keep working after reload (never store blob: preview URLs).
 */
export async function cloneBadgeModelForClaimer(args: {
  senderUserId: string;
  claimerUserId: string;
  iconAssetPath: string | null;
}): Promise<ClonedBadgeModelAsset> {
  const sourceModelPath = sanitizeBadgeAssetPath(args.iconAssetPath);
  if (!sourceModelPath) {
    throw new Error("Missing badge model asset path.");
  }

  const bundle = await downloadBadgeModelBundle({
    modelPath: sourceModelPath,
    ownerUserId: args.senderUserId,
  });

  const assetId = crypto.randomUUID();
  return uploadBadgeModelBundle({
    modelPath: buildBadgeModelPath(args.claimerUserId, assetId),
    previewPath: buildBadgePreviewPath(args.claimerUserId, assetId),
    modelBuffer: bundle.modelBuffer,
    previewBuffer: bundle.previewBuffer,
    upsert: false,
  });
}

export async function resolveClaimedBadgeIconFields(args: {
  senderUserId: string;
  claimerUserId: string;
  iconUrl: string | null;
  iconAssetKind: string | null;
  iconAssetPath: string | null;
}): Promise<{ iconUrl: string; iconAssetPath: string | null }> {
  if (!isModelBadgeAssetKind(args.iconAssetKind)) {
    return {
      iconUrl: args.iconUrl?.trim() ?? "",
      iconAssetPath: sanitizeBadgeAssetPath(args.iconAssetPath) || null,
    };
  }

  const cloned = await cloneBadgeModelForClaimer({
    senderUserId: args.senderUserId,
    claimerUserId: args.claimerUserId,
    iconAssetPath: args.iconAssetPath,
  });

  return {
    iconUrl: cloned.iconUrl,
    iconAssetPath: cloned.iconAssetPath,
  };
}
