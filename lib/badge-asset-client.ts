import type { BadgeRemoteAsset } from "@/components/achievements/achievement-editor-shared";

type BadgeModelUploadSuccess = {
  iconUrl: string;
  iconAssetKind: "model_glb";
  iconAssetPath: string;
};

export async function uploadAchievementBadgeModelAsset(
  model: File,
  poster: Blob,
): Promise<BadgeModelUploadSuccess> {
  const formData = new FormData();
  formData.set("model", model);
  formData.set("poster", poster, "badge-poster.png");

  const response = await fetch("/api/achievements/badge-model", {
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
    throw new Error(data?.error ?? "Could not upload badge model.");
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
