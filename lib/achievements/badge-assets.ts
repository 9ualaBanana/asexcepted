export const ACHIEVEMENT_BADGE_MODEL_BUCKET = "achievement-badge-models";
export const ACHIEVEMENT_BADGE_PREVIEW_BUCKET = "achievement-badge-previews";

export const BADGE_MODEL_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const BADGE_PREVIEW_MAX_FILE_BYTES = 5 * 1024 * 1024;

export function isModelBadgeAssetKind(value: string | null | undefined): boolean {
  return value === "model_glb";
}

export function buildAchievementBadgeModelPath(userId: string, assetId: string): string {
  return `${userId}/${assetId}/badge.glb`;
}

export function buildAchievementBadgePreviewPath(userId: string, assetId: string): string {
  return `${userId}/${assetId}/poster.png`;
}

export function sanitizeAchievementBadgeAssetPath(
  value: string | null | undefined,
): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.includes("..")) return "";
  return trimmed.replace(/^\/+/, "");
}

export function extractPublicBucketObjectPath(
  publicUrl: string | null | undefined,
  bucketName: string,
): string {
  const trimmed = publicUrl?.trim() ?? "";
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return "";
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return "";
  }
}

export function looksLikeGlbUpload(fileName: string, mimeType: string): boolean {
  const normalizedName = fileName.trim().toLowerCase();
  const normalizedType = mimeType.trim().toLowerCase();
  return (
    normalizedName.endsWith(".glb") &&
    (normalizedType === "" ||
      normalizedType === "model/gltf-binary" ||
      normalizedType === "application/octet-stream")
  );
}

export function isGlbHeader(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const view = new Uint8Array(buffer, 0, 4);
  return (
    view[0] === 0x67 &&
    view[1] === 0x6c &&
    view[2] === 0x54 &&
    view[3] === 0x46
  );
}
