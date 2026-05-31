"use client";

import {
  createEmptyBadgeRemoteAsset,
  type BadgeAssetSession,
  type BadgeRemoteAsset,
} from "@/components/achievements/achievement-editor-shared";
import { deleteBadgeRemoteAsset } from "@/lib/badge-asset-client";

function normalizeBadgeRemoteAsset(asset?: Partial<BadgeRemoteAsset> | null): BadgeRemoteAsset {
  return {
    iconUrl: asset?.iconUrl?.trim() ?? "",
    iconFileId: asset?.iconFileId?.trim() ?? "",
    iconAssetKind: asset?.iconAssetKind === "model_glb" ? "model_glb" : "image",
    iconAssetPath: asset?.iconAssetPath?.trim() ?? "",
  };
}

export function hasBadgeRemoteAsset(asset?: Partial<BadgeRemoteAsset> | null): boolean {
  const normalized = normalizeBadgeRemoteAsset(asset);
  return Boolean(
    normalized.iconUrl || normalized.iconFileId || normalized.iconAssetPath,
  );
}

export function clearSessionStagedUpload(session: BadgeAssetSession): void {
  session.staged = null;
}

export function setSessionStagedUpload(
  session: BadgeAssetSession,
  asset: Partial<BadgeRemoteAsset> | null,
): void {
  const normalized = normalizeBadgeRemoteAsset(asset);
  session.staged = hasBadgeRemoteAsset(normalized) ? normalized : null;
}

export function getReplacedBadgeRemoteAsset(
  previousAsset: Partial<BadgeRemoteAsset> | null | undefined,
  nextAsset: Partial<BadgeRemoteAsset> | null | undefined,
): BadgeRemoteAsset | null {
  const previous = normalizeBadgeRemoteAsset(previousAsset);
  const next = normalizeBadgeRemoteAsset(nextAsset);
  if (!hasBadgeRemoteAsset(previous)) return null;
  if (
    previous.iconUrl === next.iconUrl &&
    previous.iconFileId === next.iconFileId &&
    previous.iconAssetKind === next.iconAssetKind &&
    previous.iconAssetPath === next.iconAssetPath
  ) {
    return null;
  }
  return previous;
}

export function rollbackBadgeUploadSession(session: BadgeAssetSession): void {
  const stagedToDelete = getReplacedBadgeRemoteAsset(session.staged, session.baseline);
  if (stagedToDelete) {
    void deleteBadgeRemoteAsset(stagedToDelete).catch(() => undefined);
  }
  clearSessionStagedUpload(session);
}

export async function deleteBadgeRemoteAssetQuietly(
  asset: Partial<BadgeRemoteAsset> | null | undefined,
  onError?: (error: unknown) => void,
): Promise<void> {
  const normalized = normalizeBadgeRemoteAsset(asset);
  if (!hasBadgeRemoteAsset(normalized)) return;
  try {
    await deleteBadgeRemoteAsset(normalized);
  } catch (error) {
    onError?.(error);
  }
}

export function createAchievementBadgeRemoteAsset(
  asset?: Partial<BadgeRemoteAsset> | null,
): BadgeRemoteAsset {
  return hasBadgeRemoteAsset(asset)
    ? normalizeBadgeRemoteAsset(asset)
    : createEmptyBadgeRemoteAsset();
}
