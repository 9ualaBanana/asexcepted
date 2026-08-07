import { err, ok, type Result } from "neverthrow";

import { isPublicHttpImageUrl } from "@/lib/achievements/badge/shared/badge-assets";
import { isModelGlbAsset } from "@/lib/achievements/badge/shared/badge-model-asset";

export function isAchievementEligibleForShareInvite(
  achievement: { icon_url: string | null },
) {
  return Boolean(achievement.icon_url?.trim());
}

export function validateShareInviteBadgeSnapshot(
  snapshot: { icon_url: string | null; icon_asset_kind: string | null; icon_asset_path: string | null },
): Result<void, string> {
  if (!isAchievementEligibleForShareInvite(snapshot)) {
    return err("Only achievements with a custom badge image can be shared.");
  }

  if (isModelGlbAsset({ iconAssetKind: snapshot.icon_asset_kind, iconAssetPath: snapshot.icon_asset_path })) {
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

/** Original owner achievements only — not received dedications / claimed invites. */
export function canDedicateAchievementViaShareInvite(achievement: {
  dedicatedByUserId: string | null;
}): boolean {
  return !achievement.dedicatedByUserId;
}

export function getAchievementShareReadinessError(achievement: { icon_url: string | null; icon_asset_kind: string | null; icon_asset_path: string | null }): string | null {
  const validation = validateShareInviteBadgeSnapshot(achievement);
  return validation.isErr() ? validation.error : null;
}
