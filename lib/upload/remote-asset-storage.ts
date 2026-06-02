import { sanitizeBadgeAssetPath } from "@/lib/achievements/badge/shared/badge-assets";
import { normalizeImageKitFileId } from "@/lib/imagekit/client/imagekit-api";

import type { StagingAdapter, StagingSession } from "./staging-session";

/** ImageKit file id and/or Supabase GLB path — upload rollback/delete identity only. */
export type RemoteAssetStorageRef = {
  iconFileId: string | null;
  modelAssetPath: string | null;
};

export type RemoteAssetStorageSession = StagingSession<RemoteAssetStorageRef>;

export const remoteAssetStorageRefAdapter: StagingAdapter<RemoteAssetStorageRef> = {
  empty: () => createRemoteAssetStorageRef({}),
  hasValue(ref) {
    return Boolean(ref.iconFileId ?? ref.modelAssetPath);
  },
  equals(a, b) {
    return a.iconFileId === b.iconFileId && a.modelAssetPath === b.modelAssetPath;
  },
};

export function createRemoteAssetStorageRef(args: Partial<RemoteAssetStorageRef>): RemoteAssetStorageRef {
  return {
    iconFileId: normalizeImageKitFileId(args.iconFileId),
    modelAssetPath: sanitizeBadgeAssetPath(args.modelAssetPath),
  };
}
