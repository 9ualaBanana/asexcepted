"use client";

import {
  createEmptyBadgeStorageRef,
  type BadgeAssetSession,
  type BadgeStorageRef,
} from "@/components/achievements/achievement-editor-shared";
import { deleteBadgeRemoteAsset } from "@/lib/achievements/client/badge-asset";
import { sanitizeBadgeAssetPath } from "@/lib/achievements/badge/shared/badge-assets";

export function normalizeBadgeStorageRef(
  ref?: Partial<BadgeStorageRef> | null,
): BadgeStorageRef {
  return {
    iconFileId: ref?.iconFileId?.trim() ?? "",
    modelAssetPath: sanitizeBadgeAssetPath(ref?.modelAssetPath),
  };
}

export function hasBadgeStorageRef(ref?: Partial<BadgeStorageRef> | null): boolean {
  const normalized = normalizeBadgeStorageRef(ref);
  return Boolean(normalized.iconFileId || normalized.modelAssetPath);
}

export function clearSessionStagedUpload(session: BadgeAssetSession): void {
  session.staged = null;
}

export function setSessionStagedUpload(
  session: BadgeAssetSession,
  ref: Partial<BadgeStorageRef> | null,
): void {
  const normalized = normalizeBadgeStorageRef(ref);
  session.staged = hasBadgeStorageRef(normalized) ? normalized : null;
}

export function getReplacedBadgeStorageRef(
  previousRef: Partial<BadgeStorageRef> | null | undefined,
  nextRef: Partial<BadgeStorageRef> | null | undefined,
): BadgeStorageRef | null {
  const previous = normalizeBadgeStorageRef(previousRef);
  const next = normalizeBadgeStorageRef(nextRef);
  if (!hasBadgeStorageRef(previous)) return null;
  if (
    previous.iconFileId === next.iconFileId &&
    previous.modelAssetPath === next.modelAssetPath
  ) {
    return null;
  }
  return previous;
}

export function rollbackBadgeUploadSession(session: BadgeAssetSession): void {
  const stagedToDelete = getReplacedBadgeStorageRef(session.staged, session.baseline);
  if (stagedToDelete) {
    void deleteBadgeRemoteAsset(stagedToDelete);
  }
  clearSessionStagedUpload(session);
}

export async function deleteBadgeStorageRefQuietly(
  ref: Partial<BadgeStorageRef> | null | undefined,
  onError?: (error: unknown) => void,
): Promise<void> {
  const normalized = normalizeBadgeStorageRef(ref);
  if (!hasBadgeStorageRef(normalized)) return;
  const result = await deleteBadgeRemoteAsset(normalized);
  if (result.isErr()) {
    onError?.(new Error(result.error));
  }
}

export function createBadgeStorageRef(
  ref?: Partial<BadgeStorageRef> | null,
): BadgeStorageRef {
  return hasBadgeStorageRef(ref)
    ? normalizeBadgeStorageRef(ref)
    : createEmptyBadgeStorageRef();
}
