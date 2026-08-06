import "server-only";

import { err, ok, type Result } from "neverthrow";

import { insertClaimedAchievementFromInvite } from "@/lib/achievements/persistence/dedications";
import { todayDateString } from "@/lib/feed/format-feed-event-time";
import { buildShareInviteBadgeModelPath, BADGE_PREVIEW_BUCKET, BADGE_MODEL_BUCKET, buildShareInviteBadgePreviewPath, isModelBadgeAssetKind, isShareInviteBadgeModelPath } from "@/lib/achievements/badge/shared/badge-assets";
import { validateShareInviteBadgeSnapshot } from "@/lib/share-invites/eligibility";
import {
  pinBadgeAssetsForShareInvite,
  resolveClaimedBadgeIconFields,
} from "@/lib/achievements/badge/shared/badge-assets-server";
import type { Tables } from "@/lib/supabase/database.types";
import type { ServiceRoleSupabaseClient } from "@/lib/supabase/clients/client-types";
import { createServiceRoleSupabase } from "@/lib/supabase/clients/server";
import { fetchPublicUserDisplayName } from "@/lib/profile/follow";
import { notifyDedicationAccepted } from "@/lib/notifications/dedication-accepted";
import { userAchievementDetail } from "@/lib/routes";
import {
  buildClaimedAchievementCreateFromInvite,
  type AchievementShareInviteSnapshot,
} from "@/lib/share-invites/invite-snapshot";
import { createAchievementShareInviteToken } from "@/lib/share-invites/token";
import { createAchievementPort } from "../achievements/application/adapters";
import type { Achievement } from "@/lib/achievements/domain/achievement";
import { AchievementShareInviteCreate } from "../achievements/domain/share-invite";
import { createShareInvitePort } from "@/lib/achievements/application/adapters";

export type { AchievementShareInviteSnapshot };

type AchievementShareInviteRow = Tables<"achievement_share_invites">;

export type AchievementShareInvitePresentation = {
  invite: AchievementShareInviteCreate;
  senderDisplayName: string;
  /** Collection owner when `source_achievement_id` is set (may differ from sharer). */
  collectionOwnerUserId: string | null;
  collectionOwnerDisplayName: string | null;
};

export type AchievementSharePageKind = "invite" | "showcase";

/** How an existing achievement is shared via invite link. */
export type AchievementShareInviteIntent = "showcase" | "dedicate";

export type ClaimAchievementShareInviteSuccess = {
  achievementId: string;
  redirectPath: string;
};

export function getAchievementShareInviteKind(
  invite: Pick<AchievementShareInviteRow, "share_kind" | "source_achievement_id">,
): AchievementSharePageKind {
  return invite.share_kind === "showcase" ? "showcase" : "invite";
}

export function getAchievementShareInviteOwnerDetailPath(
  invite: Pick<AchievementShareInviteRow, "source_achievement_id">,
  collectionOwnerUserId: string,
) {
  const sourceAchievementId = invite.source_achievement_id?.trim();
  if (!sourceAchievementId) {
    return null;
  }

  return userAchievementDetail(collectionOwnerUserId, sourceAchievementId);
}

async function finalizeInviteBadgeAssetsOnRow(args: {
  supabase: ServiceRoleSupabaseClient;
  inviteId: string;
  senderUserId: string;
  snapshot: Achievement;
}): Promise<Result<Achievement, string>> {
  if (!isModelBadgeAssetKind(args.snapshot.icon_asset_kind)) {
    return ok(args.snapshot);
  }

  try {
    const pinned = await pinBadgeAssetsForShareInvite({
      inviteId: args.inviteId,
      senderUserId: args.senderUserId,
      iconAssetPath: args.snapshot.icon_asset_path,
    });
    if (!pinned) {
      return err("Could not copy the 3D badge onto this invite.");
    }

    const pinnedAt = new Date().toISOString();
    const pinnedFields = {
      icon_url: pinned.iconUrl,
      icon_asset_path: pinned.iconAssetPath,
    };
    let { error: pinUpdateError } = await args.supabase
      .from("achievement_share_invites")
      .update({ ...pinnedFields, badge_assets_pinned_at: pinnedAt })
      .eq("id", args.inviteId);

    if (
      pinUpdateError &&
      (pinUpdateError.message.includes("badge_assets_pinned_at") ||
        pinUpdateError.code === "PGRST204")
    ) {
      ({ error: pinUpdateError } = await args.supabase
        .from("achievement_share_invites")
        .update(pinnedFields)
        .eq("id", args.inviteId));
    }

    if (pinUpdateError) {
      return err(pinUpdateError.message);
    }

    return ok({
      ...args.snapshot,
      icon_url: pinned.iconUrl,
      icon_asset_path: pinned.iconAssetPath,
    });
  } catch (pinError) {
    return err(
      pinError instanceof Error
        ? pinError.message
        : "Could not prepare badge assets for this invite.",
    );
  }
}

export async function createAchievementShareInvite(args: {
  senderUserId: string;
  achievementId: string;
  intent: AchievementShareInviteIntent;
}): Promise<
  Result<
    {
      inviteId: string;
      token: string;
      snapshot: Achievement;
    },
    string
  >
> {
  const supabase = createServiceRoleSupabase();
  const achievementPort = createAchievementPort(supabase);

  const achievementResult = await achievementPort.get(args.achievementId);
  if (achievementResult.isErr()) {
    return err(achievementResult.error);
  }
  const achievement = achievementResult.value;

  const canShareResult = canBeShared(achievement, args);
  if (canShareResult.isErr()) {
    return err(canShareResult.error);
  }

  const inviteResult = await insertShareInviteWithSnapshot({
    senderUserId: args.senderUserId,
    achievement,
    shareKind: args.intent === "showcase" ? "showcase" : "invite",
  });
  if (inviteResult.isErr()) {
    return inviteResult;
  }
  if (args.intent === "showcase") {
    return inviteResult;
  }
  const invite = inviteResult.value;

  if (isModelBadgeAssetKind(invite.snapshot.icon_asset_kind)) {
    const pinnedPath = invite.snapshot.icon_asset_path;
    if (!pinnedPath || !isShareInviteBadgeModelPath(pinnedPath)) {
      const rollbackResult = await deleteShareInviteRollbackAndAssets(invite.inviteId, supabase);
      return err(rollbackResult.isErr()
        ? rollbackResult.error
        : "The 3D badge could not be prepared for this invite. Wait for the model to finish uploading, then try again."
      );
    }
  }

  const removed = await achievementPort.deleteForOwner(
    achievement.id,
    args.senderUserId,
  );
  if (removed.isErr()) {
    return err(removed.error);
  }

  return ok(invite);
}

function canBeShared(achievement: Achievement,
  args: {
    senderUserId: string;
    intent: AchievementShareInviteIntent;
  }
): Result<void, string> {
  const achievementOwner = achievement.user_id;
  const isSharedByOwner = achievementOwner === args.senderUserId;

  if (!isSharedByOwner) {
    if (args.intent !== "showcase") {
      return err("You can only dedicate achievements from your own collection.");
    }
    if (achievement.visibility !== "public") {
      return err("Only public achievements can be shared as showcase.");
    }
  } else if (achievement.dedicated_by_user_id) {
    return err("Dedicated achievements cannot be re-shared.");
  }
  return ok();
}

async function insertShareInviteWithSnapshot(args: {
  senderUserId: string;
  achievement: Achievement;
  shareKind: AchievementSharePageKind;
}): Promise<
  Result<
    {
      inviteId: string;
      token: string;
      snapshot: Achievement;
    },
    string
  >
> {
  const achievementValidation = validateShareInviteBadgeSnapshot(args.achievement);
  if (achievementValidation.isErr()) {
    return err(achievementValidation.error);
  }

  const supabase = createServiceRoleSupabase();
  const token = createAchievementShareInviteToken();

  const shareInvitePort = createShareInvitePort(supabase);
  const shareInviteResult = await shareInvitePort.create({
    senderUserId: args.senderUserId,
    snapshot: args.achievement,
    shareKind: args.shareKind,
    token,
  });
  if (shareInviteResult.isErr()) {
    return err(shareInviteResult.error);
  }
  const { inviteId } = shareInviteResult.value;

  // check why this function used to assume the owner is the sender
  // allegedly because it accesses private assets (images/models) to pin them for the invite
  // even if original achievement is gone from collection.
  const finalized = await finalizeInviteBadgeAssetsOnRow({
    supabase,
    inviteId,
    senderUserId: args.senderUserId,
    snapshot: args.achievement,
  });
  if (finalized.isErr()) {
    const rollbackResult = await deleteShareInviteRollbackAndAssets(
      inviteId,
      supabase,
    );
    return err(rollbackResult.isErr() ? rollbackResult.error : finalized.error);
  }

  return ok({
    inviteId,
    token,
    snapshot: finalized.value,
  });
}

// make atomic rollback of the invite and the badge assets
async function deleteShareInviteRollbackAndAssets(inviteId: string, supabase: ServiceRoleSupabaseClient): Promise<Result<void, string>> {
  const shareInvitePort = createShareInvitePort(supabase);
  const rollbackResult = await shareInvitePort.delete(inviteId);
  if (rollbackResult.isErr()) {
    return rollbackResult;
  }
  const modelPath = buildShareInviteBadgeModelPath(inviteId);
  const previewPath = buildShareInviteBadgePreviewPath(inviteId);
  await supabase.storage.from(BADGE_MODEL_BUCKET).remove([modelPath]);
  await supabase.storage.from(BADGE_PREVIEW_BUCKET).remove([previewPath]);
  return ok();
}

export async function getAchievementShareInvitePresentationByToken(
  token: string,
): Promise<Result<AchievementShareInvitePresentation, "not-found" | string>> {
  const supabase = createServiceRoleSupabase();
  const shareInvitePort = createShareInvitePort(supabase);
  const achievementPort = createAchievementPort(supabase);

  const inviteResult = await shareInvitePort.get(token);
  if (inviteResult.isErr()) {
    return err(inviteResult.error);
  }
  const invite = inviteResult.value;

  const senderNameResult = await fetchPublicUserDisplayName(supabase, invite.sender_user_id);
  const senderDisplayName = senderNameResult.isOk() ? senderNameResult.value : "Someone";

  let collectionOwnerUserId: string | null = null;
  let collectionOwnerDisplayName: string | null = null;
  const sourceAchievementId = invite.source_achievement_id?.trim();
  if (sourceAchievementId) {
    const ownerResult = await achievementPort.getAchievementOwnerUserId(sourceAchievementId);
    if (ownerResult.isOk() && ownerResult.value) {
      collectionOwnerUserId = ownerResult.value;
      const ownerNameResult = await fetchPublicUserDisplayName(
        supabase,
        collectionOwnerUserId,
      );
      collectionOwnerDisplayName = ownerNameResult.isOk() ? ownerNameResult.value : "Someone";
    }
  }

  return ok({
    invite,
    senderDisplayName,
    collectionOwnerUserId,
    collectionOwnerDisplayName,
  });
}

export async function claimAchievementShareInvite(args: {
  token: string;
  claimerUserId: string;
  autoAccept: boolean;
}): Promise<Result<ClaimAchievementShareInviteSuccess, string>> {
  const supabase = createServiceRoleSupabase();
  const shareInvitePort = createShareInvitePort(supabase);
  const claimedAt = new Date().toISOString();

  const reservedInviteResult = await shareInvitePort.reserveClaim(args.claimerUserId, args.token, claimedAt);
  if (reservedInviteResult.isErr()) {
    return err(reservedInviteResult.error);
  }
  const reservedInvite = reservedInviteResult.value;

  if (getAchievementShareInviteKind(reservedInvite) === "showcase") {
    const rollbackResult = await shareInvitePort.releaseClaim(reservedInvite.id);
    if (rollbackResult.isErr()) {
      return err(rollbackResult.error);
    }
    return err("This shared achievement is showcase-only.");
  }
  if (reservedInvite.sender_user_id === args.claimerUserId) {
    const rollbackResult = await shareInvitePort.releaseClaim(reservedInvite.id);
    if (rollbackResult.isErr()) {
      return err(rollbackResult.error);
    }
    return err("You cannot claim your own invite.");
  }

  const achievedAt = reservedInvite.achieved_at ?? todayDateString();
  const dedicationStatus = args.autoAccept ? "accepted" : "pending";

  let claimedIconUrl = reservedInvite.icon_url?.trim() ?? "";
  let claimedIconAssetPath = reservedInvite.icon_asset_path;

  try {
    const resolvedIcon = await resolveClaimedBadgeIconFields({
      senderUserId: reservedInvite.sender_user_id,
      claimerUserId: args.claimerUserId,
      iconUrl: reservedInvite.icon_url,
      iconAssetKind: reservedInvite.icon_asset_kind,
      iconAssetPath: reservedInvite.icon_asset_path,
    });
    claimedIconUrl = resolvedIcon.iconUrl;
    claimedIconAssetPath = resolvedIcon.iconAssetPath;
  } catch (cloneError) {
    const rollbackResult = await shareInvitePort.releaseClaim(reservedInvite.id);
    if (rollbackResult.isErr()) {
      return err(rollbackResult.error);
    }
    return err(
      cloneError instanceof Error
        ? cloneError.message
        : "Could not copy the shared 3D badge for your collection.",
    );
  }

  const createResult = await insertClaimedAchievementFromInvite(
    supabase,
    buildClaimedAchievementCreateFromInvite({
      invite: reservedInvite,
      claimerUserId: args.claimerUserId,
      iconUrl: claimedIconUrl,
      iconAssetPath: claimedIconAssetPath,
      achievedAt,
      dedicationStatus,
    }),
  );

  if (createResult.isErr()) {
    const rollbackResult = await shareInvitePort.releaseClaim(reservedInvite.id);
    if (rollbackResult.isErr()) {
      return err(rollbackResult.error);
    }
    return err(createResult.error);
  }
  const createdAchievement = createResult.value;

  const claimResult = await shareInvitePort.completeClaim(reservedInvite.id, createdAchievement.id, args.claimerUserId, claimedAt);
  if (claimResult.isErr()) {
    const rollbackResult = await shareInvitePort.releaseClaim(reservedInvite.id);
    if (rollbackResult.isErr()) {
      return err(rollbackResult.error);
    }
    return err(claimResult.error);
  }

  if (args.autoAccept) {
    await notifyDedicationAccepted(createdAchievement.id);
  }

  return ok({
    achievementId: createdAchievement.id,
    redirectPath: userAchievementDetail(
      args.claimerUserId,
      createdAchievement.id,
      !args.autoAccept,
    ),
  });
}

