"use client";

import {
  type RemoteAssetStorageRef,
  type RemoteAssetStorageSession,
} from "@/components/achievements/achievement-editor-shared";
import { deleteBadgeRemoteAsset } from "@/lib/achievements/client/badge-asset";
import {
  remoteAssetStorageRefAdapter,
  type RemoteAssetStorageRef as Ref,
} from "@/lib/upload/remote-asset-storage";
import {
  beginStagingSession,
  clearStaged,
  commitStagingBaseline,
  createEmptyStagingSession,
  getReplaced,
  rollbackStagingSession,
  stageUpload,
} from "@/lib/upload/staging-session";

const remoteAssetStorageEffects = {
  delete(ref: Ref) {
    void deleteBadgeRemoteAsset(ref);
  },
};

export function clearSessionStagedUpload(session: RemoteAssetStorageSession): void {
  clearStaged(session);
}

export function setSessionStagedUpload(
  session: RemoteAssetStorageSession,
  ref: RemoteAssetStorageRef | null,
): void {
  if (!ref) {
    clearStaged(session);
    return;
  }
  stageUpload(session, ref, remoteAssetStorageRefAdapter);
}

export function getReplacedRemoteAssetStorageRef(
  previousRef: RemoteAssetStorageRef,
  nextRef: RemoteAssetStorageRef,
): RemoteAssetStorageRef | null {
  return getReplaced(previousRef, nextRef, remoteAssetStorageRefAdapter);
}

export function rollbackBadgeUploadSession(session: RemoteAssetStorageSession): void {
  rollbackStagingSession(session, remoteAssetStorageRefAdapter, remoteAssetStorageEffects);
}

export function commitRemoteAssetStorageBaseline(
  session: RemoteAssetStorageSession,
  nextBaseline: RemoteAssetStorageRef,
): RemoteAssetStorageRef | null {
  return commitStagingBaseline(
    session,
    nextBaseline,
    remoteAssetStorageRefAdapter,
  );
}

export async function deleteRemoteAssetStorageRefQuietly(
  ref: RemoteAssetStorageRef,
  onError?: (error: unknown) => void,
): Promise<void> {
  if (!remoteAssetStorageRefAdapter.hasValue(ref)) return;
  const result = await deleteBadgeRemoteAsset(ref);
  if (result.isErr()) {
    onError?.(new Error(result.error));
  }
}

export function beginRemoteAssetStorageSession(
  initialBaseline: RemoteAssetStorageRef,
): RemoteAssetStorageSession {
  return beginStagingSession(initialBaseline, remoteAssetStorageRefAdapter);
}

export function createEmptyRemoteAssetStorageSession(): RemoteAssetStorageSession {
  return createEmptyStagingSession(remoteAssetStorageRefAdapter);
}
