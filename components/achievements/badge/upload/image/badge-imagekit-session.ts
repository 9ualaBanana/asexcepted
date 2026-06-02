"use client";

import type { BadgeIkSession } from "@/components/achievements/achievement-editor-shared";
import { deleteImageKitFile } from "@/lib/imagekit-client";

export function normalizeImageKitFileId(fileId: string | null | undefined): string {
  return fileId?.trim() ?? "";
}

export function clearSessionStagedUpload(session: BadgeIkSession): void {
  session.lastSessionFileId = null;
}

export function setSessionStagedUpload(
  session: BadgeIkSession,
  fileId: string | null | undefined,
): void {
  session.lastSessionFileId = normalizeImageKitFileId(fileId) || null;
}

export function getReplacedImageKitFileId(
  previousFileId: string | null | undefined,
  nextFileId: string | null | undefined,
): string | null {
  const previous = normalizeImageKitFileId(previousFileId);
  const next = normalizeImageKitFileId(nextFileId);
  if (!previous || previous === next) return null;
  return previous;
}

export function rollbackBadgeUploadSession(session: BadgeIkSession): void {
  const stagedToDelete = getReplacedImageKitFileId(
    session.lastSessionFileId,
    session.baselineFileId,
  );
  if (stagedToDelete) {
    void deleteImageKitFile(stagedToDelete).catch(() => undefined);
  }
  clearSessionStagedUpload(session);
}

export function retainBadgeUploadSession(
  session: BadgeIkSession,
  retainedUrl: string | null | undefined,
  retainedFileId: string | null | undefined,
): void {
  session.baselineUrl = retainedUrl?.trim() ?? "";
  session.baselineFileId = normalizeImageKitFileId(retainedFileId);
  clearSessionStagedUpload(session);
}

export async function deleteImageKitFileQuietly(
  fileId: string | null | undefined,
  onError?: (error: unknown) => void,
): Promise<void> {
  const normalized = normalizeImageKitFileId(fileId);
  if (!normalized) return;
  try {
    await deleteImageKitFile(normalized);
  } catch (error) {
    onError?.(error);
  }
}
