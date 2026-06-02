/** Supabase bucket id (unchanged in storage). */
export const BADGE_MODEL_BUCKET = "achievement-badge-models";
export const BADGE_PREVIEW_BUCKET = "achievement-badge-previews";

export const BADGE_MODEL_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const BADGE_PREVIEW_MAX_FILE_BYTES = 5 * 1024 * 1024;

export {
  BADGE_MODEL_ASSET_KIND,
  badgeModelAssetFieldsFromModel,
  applyBadgeModelToForm,
  badgeModelFromForm,
  badgeModelFromStagedUpload,
  remoteAssetStorageRefDeletePayload,
  badgeStorageRefDeletePayload,
  patchBadgeModelAsset,
  isModelBadgeAssetKind,
  isModelGlbAsset,
  parseBadgeModelAsset,
  type BadgeModelAsset,
  type BadgeModelAssetFields,
  type BadgeModelAssetKind,
} from "./badge-model-asset";

/** Trimmed badge URL, or `null` when absent — apply at DB/API boundaries only. */
export function normalizeBadgeIconUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

/** Persisted badge URLs must be fetchable after reload (not session blob/data URLs). */
export function isPublicHttpImageUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return false;
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildBadgeModelPath(userId: string, assetId: string): string {
  return `${userId}/${assetId}/badge.glb`;
}

export function buildBadgePreviewPath(userId: string, assetId: string): string {
  return `${userId}/${assetId}/poster.png`;
}

/** Supabase preview object path paired with a badge GLB path (user or invite scope). */
export function badgePreviewPathFromModelPath(modelPath: string): string {
  const sanitized = sanitizeBadgeAssetPath(modelPath);
  if (!sanitized) return "";
  if (isShareInviteBadgeModelPath(sanitized)) {
    const inviteId = sanitized.split("/")[1] ?? "";
    return inviteId ? buildShareInviteBadgePreviewPath(inviteId) : "";
  }
  const [userId, assetId] = sanitized.split("/");
  if (!userId || !assetId) return "";
  return buildBadgePreviewPath(userId, assetId);
}

/** Invite-scoped badge assets (survive sender deleting their collection copy). */
export function buildShareInviteBadgeModelPath(inviteId: string): string {
  return `invites/${inviteId}/badge.glb`;
}

export function buildShareInviteBadgePreviewPath(inviteId: string): string {
  return `invites/${inviteId}/poster.png`;
}

export function isShareInviteBadgeModelPath(path: string): boolean {
  return /^invites\/[^/]+\/badge\.glb$/.test(path);
}

export function sanitizeBadgeAssetPath(
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
