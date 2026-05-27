import type { BadgeRemoteAsset } from "@/components/achievements/achievement-editor-shared";
import { ACHIEVEMENT_BADGE_MODEL_BUCKET } from "@/lib/achievements/badge-assets";
import { createClient } from "@/lib/supabase/client";

type BadgeModelUploadSuccess = {
  iconUrl: string;
  iconAssetKind: "model_glb";
  iconAssetPath: string;
};

type BadgeModelUploadTarget = {
  modelPath: string;
  token: string;
};

async function requestBadgeModelUploadTarget(): Promise<BadgeModelUploadTarget> {
  const response = await fetch("/api/achievements/badge-model/upload-url", {
    method: "POST",
  });

  const data = (await response.json().catch(() => null)) as {
    error?: string;
    modelPath?: string;
    token?: string;
  } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Could not prepare 3D badge upload.");
  }
  if (!data?.modelPath?.trim() || !data.token?.trim()) {
    throw new Error("Invalid 3D badge upload preparation response.");
  }

  return {
    modelPath: data.modelPath,
    token: data.token,
  };
}

async function uploadBadgeModelToSignedUrl(
  target: BadgeModelUploadTarget,
  model: File,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(ACHIEVEMENT_BADGE_MODEL_BUCKET)
    .uploadToSignedUrl(target.modelPath, target.token, model, {
      contentType: "model/gltf-binary",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }
}

async function completeBadgeModelUpload(
  modelPath: string,
  poster: Blob,
): Promise<BadgeModelUploadSuccess> {
  const formData = new FormData();
  formData.set("modelPath", modelPath);
  formData.set("poster", poster, "badge-poster.png");

  const response = await fetch("/api/achievements/badge-model/complete", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json().catch(() => null)) as {
    error?: string;
    iconUrl?: string;
    iconAssetKind?: "model_glb";
    iconAssetPath?: string;
  } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Could not finalize badge model upload.");
  }
  if (
    !data?.iconUrl?.trim() ||
    data.iconAssetKind !== "model_glb" ||
    !data.iconAssetPath?.trim()
  ) {
    throw new Error("Invalid badge model upload response.");
  }

  return {
    iconUrl: data.iconUrl,
    iconAssetKind: data.iconAssetKind,
    iconAssetPath: data.iconAssetPath,
  };
}

export async function uploadBadgeModelGlbOnly(model: File): Promise<{ modelPath: string }> {
  const target = await requestBadgeModelUploadTarget();
  await uploadBadgeModelToSignedUrl(target, model);
  return { modelPath: target.modelPath };
}

export async function finalizeBadgeModelUpload(args: {
  modelPath: string;
  poster: Blob;
}): Promise<BadgeModelUploadSuccess> {
  return completeBadgeModelUpload(args.modelPath, args.poster);
}

export async function uploadAchievementBadgeModelAsset(
  model: File,
  poster: Blob,
): Promise<BadgeModelUploadSuccess> {
  const { modelPath } = await uploadBadgeModelGlbOnly(model);
  return finalizeBadgeModelUpload({ modelPath, poster });
}

export async function deleteBadgeRemoteAsset(asset: BadgeRemoteAsset): Promise<void> {
  const response = await fetch("/api/achievements/badge-asset", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      iconUrl: asset.iconUrl,
      iconFileId: asset.iconFileId,
      iconAssetPath: asset.iconAssetPath,
      iconAssetKind: asset.iconAssetKind,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Badge asset delete failed (${response.status})`);
  }
}

export async function fetchSignedBadgeModelUrl(assetPath: string): Promise<string> {
  const response = await fetch("/api/achievements/badge-model-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetPath }),
  });

  const data = (await response.json().catch(() => null)) as {
    error?: string;
    signedUrl?: string;
  } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Could not load badge model.");
  }
  if (!data?.signedUrl?.trim()) {
    throw new Error("Badge model URL response was empty.");
  }

  return data.signedUrl;
}
