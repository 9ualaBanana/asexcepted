import { err, ok, type Result } from "neverthrow";

import type { AchievementDbWritePayload } from "@/components/achievements/achievement-db-schema";
import {
  isModelBadgeAssetKind,
  isPublicHttpImageUrl,
  sanitizeAchievementBadgeAssetPath,
} from "@/lib/achievements/badge-assets";
import type { AchievementShareInviteSnapshot } from "@/lib/share-invites/invite-snapshot";
import { shareInviteSnapshotFromAchievementRow } from "@/lib/share-invites/invite-snapshot";
import type { CollectionAchievementSnapshotSource } from "@/lib/share-invites/invite-snapshot";

export function isAchievementEligibleForShareInvite(
  payload: Pick<AchievementDbWritePayload, "icon_url">,
) {
  return Boolean(payload.icon_url?.trim());
}

export function validateShareInviteBadgeSnapshot(
  snapshot: AchievementShareInviteSnapshot,
): Result<void, string> {
  if (!isAchievementEligibleForShareInvite(snapshot)) {
    return err("Only achievements with a custom badge image can be shared.");
  }

  if (isModelBadgeAssetKind(snapshot.icon_asset_kind)) {
    if (!sanitizeAchievementBadgeAssetPath(snapshot.icon_asset_path)) {
      return err("Finish uploading the 3D badge before sharing this invite.");
    }
    if (!isPublicHttpImageUrl(snapshot.icon_url)) {
      return err(
        "The 3D badge preview is not saved yet. Wait for upload to finish, then share again.",
      );
    }
    return ok(undefined);
  }

  if (!isPublicHttpImageUrl(snapshot.icon_url)) {
    return err("Badge image must finish uploading before you can share an invite.");
  }

  return ok(undefined);
}

export function getAchievementShareReadinessError(
  achievement: CollectionAchievementSnapshotSource,
): string | null {
  const validation = validateShareInviteBadgeSnapshot(
    shareInviteSnapshotFromAchievementRow(achievement),
  );
  return validation.isErr() ? validation.error : null;
}
