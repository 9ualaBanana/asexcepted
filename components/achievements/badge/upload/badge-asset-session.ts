"use client";

import {
  createEmptyBadgeRemoteAsset,
  type BadgeAssetSession,
  type BadgeRemoteAsset,
} from "@/components/achievements/achievement-editor-shared";
import { deleteBadgeRemoteAsset } from "@/lib/achievements/client/badge-asset";

function normalizeBadgeRemoteAsset(asset?: Partial<BadgeRemoteAsset> | null): BadgeRemoteAsset {
  return {
    iconUrl: asset?.iconUrl?.trim() ?? "",
    iconFileId: asset?.iconFileId?.trim() ?? "",
    model: asset?.model ?? null,
  };
}

function sameBadgeModel(
  a: BadgeRemoteAsset["model"],
  b: BadgeRemoteAsset["model"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.assetPath === b.assetPath &&
    a.yaw === b.yaw &&
    a.pitch === b.pitch &&
    a.animationPlay === b.animationPlay &&
    a.animationSpeed === b.animationSpeed &&
    a.ccAttribution === b.ccAttribution
  );
}

export function hasBadgeRemoteAsset(asset?: Partial<BadgeRemoteAsset> | null): boolean {
  const normalized = normalizeBadgeRemoteAsset(asset);
  return Boolean(
    normalized.iconUrl || normalized.iconFileId || normalized.model?.assetPath,
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
    sameBadgeModel(previous.model, next.model)
  ) {
    return null;
  }
  return previous;
}

export function rollbackBadgeUploadSession(session: BadgeAssetSession): void {
  const stagedToDelete = getReplacedBadgeRemoteAsset(session.staged, session.baseline);
  if (stagedToDelete) {
    void deleteBadgeRemoteAsset(stagedToDelete);
  }
  clearSessionStagedUpload(session);
}

export async function deleteBadgeRemoteAssetQuietly(
  asset: Partial<BadgeRemoteAsset> | null | undefined,
  onError?: (error: unknown) => void,
): Promise<void> {
  const normalized = normalizeBadgeRemoteAsset(asset);
  if (!hasBadgeRemoteAsset(normalized)) return;
  const result = await deleteBadgeRemoteAsset(normalized);
  if (result.isErr()) {
    onError?.(new Error(result.error));
  }
}

export function createBadgeRemoteAsset(
  asset?: Partial<BadgeRemoteAsset> | null,
): BadgeRemoteAsset {
  return hasBadgeRemoteAsset(asset)
    ? normalizeBadgeRemoteAsset(asset)
    : createEmptyBadgeRemoteAsset();
}
