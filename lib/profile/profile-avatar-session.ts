import type { BadgeIkSession } from "@/components/achievements/achievement-editor-shared";
import {
  clearSessionStagedUpload,
  deleteImageKitFileQuietly,
  getReplacedImageKitFileId,
  normalizeImageKitFileId,
  rollbackBadgeUploadSession,
  setSessionStagedUpload,
} from "@/components/achievements/badge/upload/image/badge-imagekit-session";

export type ProfileAvatarUploadSession = BadgeIkSession;

export function createEmptyProfileAvatarSession(): ProfileAvatarUploadSession {
  return {
    baselineFileId: "",
    lastSessionFileId: null,
  };
}

export function beginProfileAvatarSession(
  savedFileId: string,
): ProfileAvatarUploadSession {
  return {
    baselineFileId: savedFileId.trim(),
    lastSessionFileId: null,
  };
}

/**
 * Same as badge `onUploadStorageCommit`: drop any prior staged file in this
 * edit session, then record the new upload.
 */
export function stageProfileAvatarUpload(
  session: ProfileAvatarUploadSession,
  fileId: string,
): void {
  rollbackBadgeUploadSession(session);
  setSessionStagedUpload(session, fileId);
}

/** Discard staged avatar upload(s); UI should revert to saved preview state. */
export function discardProfileAvatarUploadSession(
  session: ProfileAvatarUploadSession,
): void {
  rollbackBadgeUploadSession(session);
}

/**
 * After a successful profile save: return baseline file id to delete on ImageKit.
 */
export function commitProfileAvatarUploadSession(
  session: ProfileAvatarUploadSession,
  savedFileId: string,
): string | null {
  const replacedBaselineId = getReplacedImageKitFileId(
    session.baselineFileId,
    savedFileId,
  );
  session.baselineFileId = normalizeImageKitFileId(savedFileId);
  clearSessionStagedUpload(session);
  return replacedBaselineId;
}

export {
  clearSessionStagedUpload as clearProfileAvatarStagedUpload,
  deleteImageKitFileQuietly,
  getReplacedImageKitFileId,
  normalizeImageKitFileId,
  rollbackBadgeUploadSession as rollbackProfileAvatarSession,
  setSessionStagedUpload as setProfileAvatarStagedUpload,
};
