import {
  beginRemoteAssetStorageSession,
  clearSessionStagedUpload,
  commitRemoteAssetStorageBaseline,
  rollbackBadgeUploadSession,
  setSessionStagedUpload,
} from "@/components/achievements/badge/upload/badge-asset-session";
import type { RemoteAssetStorageSession } from "@/lib/upload/remote-asset-storage";
import {
  createRemoteAssetStorageRef,
  type RemoteAssetStorageRef,
} from "@/lib/upload/remote-asset-storage";
import {
  deleteImageKitFileQuietly,
} from "@/lib/imagekit/client/imagekit-api";

export type ProfileAvatarUploadSession = RemoteAssetStorageSession;

export function beginProfileAvatarSession(
  savedFileId: string,
): ProfileAvatarUploadSession {
  return beginRemoteAssetStorageSession(
    createRemoteAssetStorageRef({ iconFileId: savedFileId }),
  );
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
  setSessionStagedUpload(session, createRemoteAssetStorageRef({ iconFileId: fileId }));
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
  const replacedBaseline = commitRemoteAssetStorageBaseline(
    session,
    createRemoteAssetStorageRef({ iconFileId: savedFileId }),
  );
  return replacedBaseline?.iconFileId ?? null;
}

export {
  clearSessionStagedUpload as clearProfileAvatarStagedUpload,
  deleteImageKitFileQuietly,
  rollbackBadgeUploadSession as rollbackProfileAvatarSession,
  setSessionStagedUpload as setProfileAvatarStagedUpload,
};

export type { RemoteAssetStorageRef };
