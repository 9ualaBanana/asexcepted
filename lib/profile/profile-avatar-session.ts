import type { BadgeIkSession } from "@/components/achievements/achievement-editor-shared";
import {
  clearSessionStagedUpload,
  deleteImageKitFileQuietly,
  getReplacedImageKitFileId,
  normalizeImageKitFileId,
  rollbackBadgeUploadSession,
  setSessionStagedUpload,
} from "@/components/achievements/badge/badge-imagekit-session";

export type ProfileAvatarUploadSession = BadgeIkSession;

export function createEmptyProfileAvatarSession(): ProfileAvatarUploadSession {
  return {
    baselineUrl: "",
    baselineFileId: "",
    lastSessionFileId: null,
  };
}

export function beginProfileAvatarSession(
  savedUrl: string,
  savedFileId: string,
): ProfileAvatarUploadSession {
  return {
    baselineUrl: savedUrl.trim(),
    baselineFileId: savedFileId.trim(),
    lastSessionFileId: null,
  };
}

/**
 * Same as badge `onRemoteUploadCommit`: drop any prior staged file in this
 * edit session, then record the new upload.
 */
export function stageProfileAvatarUpload(
  session: ProfileAvatarUploadSession,
  fileId: string,
): void {
  rollbackBadgeUploadSession(session);
  setSessionStagedUpload(session, fileId);
}

/** Discard staged avatar upload(s); UI should revert to session baselines. */
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
  savedUrl: string,
  savedFileId: string,
): string | null {
  const replacedBaselineId = getReplacedImageKitFileId(
    session.baselineFileId,
    savedFileId,
  );
  session.baselineUrl = savedUrl.trim();
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
