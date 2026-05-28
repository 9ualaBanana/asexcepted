import "server-only";

import { err, ok, type Result } from "neverthrow";

import type { AchievementDbWritePayload } from "@/components/achievements/achievement-db-schema";
import { todayDateString } from "@/components/achievements/achievement-editor-shared";
import { isModelBadgeAssetKind, isShareInviteBadgeModelPath } from "@/lib/achievements/badge-assets";
import { validateShareInviteBadgeSnapshot } from "@/lib/share-invites/eligibility";
import { deleteShareInviteRollback } from "@/lib/share-invites/invite-rollback";
import {
  pinBadgeAssetsForShareInvite,
  resolveClaimedBadgeIconFields,
} from "@/lib/achievements/badge-assets-server";
import type { Tables } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchPublicUserDisplayName } from "@/lib/user-profile-db";
import { notifyDedicationAccepted } from "@/lib/notifications/dedication-accepted";
import { userAchievementDetail } from "@/lib/routes";
import {
  buildClaimedAchievementInsertFromInvite,
  shareInviteSnapshotFromAchievementRow,
  shareInviteSnapshotFromWritePayload,
  type AchievementShareInviteSnapshot,
} from "@/lib/share-invites/invite-snapshot";
import {
  createAchievementShareInviteToken,
  hashAchievementShareInviteToken,
} from "@/lib/share-invites/token";
import { formatSupabaseSingleRowError } from "@/lib/supabase/postgrest-errors";

export { isAchievementEligibleForShareInvite } from "@/lib/share-invites/eligibility";

export type { AchievementShareInviteSnapshot };

type AchievementShareInviteRow = Tables<"achievement_share_invites">;
type AchievementRow = Tables<"achievements">;

const COLLECTION_ACHIEVEMENT_SNAPSHOT_SELECT =
  "id,user_id,title,description,category,icon,icon_url,icon_file_id,icon_asset_kind,icon_asset_path,icon_cc_attribution,icon_model_yaw,icon_model_pitch,tone,achieved_at,visibility,dedicated_by_user_id" as const;

export type AchievementShareInvitePresentation = {
  invite: AchievementShareInviteRow;
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
  supabase: ReturnType<typeof createServiceRoleClient>;
  inviteId: string;
  badgeAssetOwnerUserId: string;
  snapshot: AchievementShareInviteSnapshot;
}): Promise<Result<AchievementShareInviteSnapshot, string>> {
  if (!isModelBadgeAssetKind(args.snapshot.icon_asset_kind)) {
    return ok({ ...args.snapshot });
  }

  try {
    const pinned = await pinBadgeAssetsForShareInvite({
      inviteId: args.inviteId,
      senderUserId: args.badgeAssetOwnerUserId,
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

async function insertShareInviteWithSnapshot(args: {
  senderUserId: string;
  snapshot: AchievementShareInviteSnapshot;
  sourceAchievementId: string | null;
  shareKind: AchievementSharePageKind;
  badgeAssetOwnerUserId?: string;
}): Promise<
  Result<
    {
      inviteId: string;
      token: string;
      snapshot: AchievementShareInviteSnapshot;
    },
    string
  >
> {
  const snapshotValidation = validateShareInviteBadgeSnapshot(args.snapshot);
  if (snapshotValidation.isErr()) {
    return err(snapshotValidation.error);
  }

  const supabase = createServiceRoleClient();
  const token = createAchievementShareInviteToken();
  const tokenHash = hashAchievementShareInviteToken(token);

  const { data, error } = await supabase
    .from("achievement_share_invites")
    .insert({
      sender_user_id: args.senderUserId,
      source_achievement_id: args.sourceAchievementId,
      share_kind: args.shareKind,
      title: args.snapshot.title,
      description: args.snapshot.description,
      category: args.snapshot.category,
      icon: args.snapshot.icon,
      icon_url: args.snapshot.icon_url,
      icon_file_id: args.snapshot.icon_file_id,
      icon_asset_kind: args.snapshot.icon_asset_kind,
      icon_asset_path: args.snapshot.icon_asset_path,
      icon_cc_attribution: args.snapshot.icon_cc_attribution,
      icon_model_yaw: args.snapshot.icon_model_yaw,
      icon_model_pitch: args.snapshot.icon_model_pitch,
      tone: args.snapshot.tone,
      achieved_at: args.snapshot.achieved_at,
      token_hash: tokenHash,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return err(
      formatSupabaseSingleRowError(error, "Could not create the share invite. Try again."),
    );
  }
  if (!data?.id) {
    return err("Could not create the share invite. Try again.");
  }

  const finalized = await finalizeInviteBadgeAssetsOnRow({
    supabase,
    inviteId: data.id,
    badgeAssetOwnerUserId: args.badgeAssetOwnerUserId ?? args.senderUserId,
    snapshot: args.snapshot,
  });
  if (finalized.isErr()) {
    await deleteShareInviteRollback(data.id, supabase);
    return err(finalized.error);
  }

  return ok({
    inviteId: data.id,
    token,
    snapshot: finalized.value,
  });
}

export async function createAchievementShareInviteFromPayload(args: {
  senderUserId: string;
  payload: AchievementDbWritePayload;
  sourceAchievementId?: string | null;
}): Promise<
  Result<
    {
      inviteId: string;
      token: string;
      snapshot: AchievementShareInviteSnapshot;
    },
    string
  >
> {
  const sourceAchievementId = args.sourceAchievementId ?? null;
  return insertShareInviteWithSnapshot({
    senderUserId: args.senderUserId,
    snapshot: shareInviteSnapshotFromWritePayload(args.payload),
    sourceAchievementId,
    shareKind: sourceAchievementId ? "showcase" : "invite",
  });
}

async function removeSenderAchievementRowOnly(
  supabase: ReturnType<typeof createServiceRoleClient>,
  achievementId: string,
  senderUserId: string,
): Promise<Result<void, string>> {
  const { error } = await supabase
    .from("achievements")
    .delete()
    .eq("id", achievementId)
    .eq("user_id", senderUserId);

  if (error) {
    return err(error.message);
  }

  return ok(undefined);
}

export async function createAchievementShareInviteFromExistingAchievement(args: {
  senderUserId: string;
  achievementId: string;
  intent: AchievementShareInviteIntent;
}): Promise<
  Result<
    {
      inviteId: string;
      token: string;
      snapshot: AchievementShareInviteSnapshot;
    },
    string
  >
> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("achievements")
    .select(COLLECTION_ACHIEVEMENT_SNAPSHOT_SELECT)
    .eq("id", args.achievementId)
    .maybeSingle();

  if (error) {
    return err(
      formatSupabaseSingleRowError(error, "This achievement could not be found."),
    );
  }
  if (!data) {
    return err("This achievement could not be found.");
  }

  const achievement = data as Pick<
    AchievementRow,
    "id" | "user_id" | "visibility" | "dedicated_by_user_id"
  > &
    Parameters<typeof shareInviteSnapshotFromAchievementRow>[0];

  const collectionOwnerId = achievement.user_id;
  const isCollectionOwner = collectionOwnerId === args.senderUserId;

  if (!isCollectionOwner) {
    if (args.intent !== "showcase") {
      return err("You can only dedicate achievements from your own collection.");
    }
    if (achievement.visibility !== "public") {
      return err("Only public achievements can be shared as showcase.");
    }
  } else if (achievement.dedicated_by_user_id) {
    return err("Dedicated achievements cannot be re-shared.");
  }

  const snapshot = shareInviteSnapshotFromAchievementRow(achievement);
  const badgeAssetOwnerUserId = collectionOwnerId;

  if (args.intent === "showcase") {
    return insertShareInviteWithSnapshot({
      senderUserId: args.senderUserId,
      snapshot,
      sourceAchievementId: achievement.id,
      shareKind: "showcase",
      badgeAssetOwnerUserId,
    });
  }

  const inviteResult = await insertShareInviteWithSnapshot({
    senderUserId: args.senderUserId,
    snapshot,
    sourceAchievementId: null,
    shareKind: "invite",
    badgeAssetOwnerUserId,
  });

  if (inviteResult.isErr()) {
    return inviteResult;
  }

  const { data: achievementStillOwned, error: verifyError } = await supabase
    .from("achievements")
    .select("id")
    .eq("id", achievement.id)
    .eq("user_id", args.senderUserId)
    .maybeSingle();

  if (verifyError) {
    await deleteShareInviteRollback(inviteResult.value.inviteId, supabase);
    return err(
      formatSupabaseSingleRowError(
        verifyError,
        "Could not verify your achievement before completing the dedicate link.",
      ),
    );
  }
  if (!achievementStillOwned) {
    await deleteShareInviteRollback(inviteResult.value.inviteId, supabase);
    return err(
      "This achievement is no longer in your collection. It may have already been dedicated.",
    );
  }

  if (isModelBadgeAssetKind(inviteResult.value.snapshot.icon_asset_kind)) {
    const pinnedPath = inviteResult.value.snapshot.icon_asset_path;
    if (!pinnedPath || !isShareInviteBadgeModelPath(pinnedPath)) {
      await deleteShareInviteRollback(inviteResult.value.inviteId, supabase);
      return err(
        "The 3D badge could not be prepared for this invite. Wait for the model to finish uploading, then try again.",
      );
    }
  }

  const removed = await removeSenderAchievementRowOnly(
    supabase,
    achievement.id,
    args.senderUserId,
  );
  if (removed.isErr()) {
    return err(
      "Invite link was created, but your copy could not be removed from your collection. Delete it manually to avoid duplicates.",
    );
  }

  return inviteResult;
}

export async function getAchievementShareInvitePresentationByToken(
  token: string,
): Promise<Result<AchievementShareInvitePresentation, "not-found" | string>> {
  const supabase = createServiceRoleClient();
  const tokenHash = hashAchievementShareInviteToken(token);
  const { data, error } = await supabase
    .from("achievement_share_invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return err(error.message);
  }
  if (!data) {
    return err("not-found");
  }

  const senderNameResult = await fetchPublicUserDisplayName(supabase, data.sender_user_id);
  const senderDisplayName = senderNameResult.isOk() ? senderNameResult.value : "Someone";

  let collectionOwnerUserId: string | null = null;
  let collectionOwnerDisplayName: string | null = null;
  const sourceAchievementId = data.source_achievement_id?.trim();
  if (sourceAchievementId) {
    const { data: sourceRow, error: sourceError } = await supabase
      .from("achievements")
      .select("user_id")
      .eq("id", sourceAchievementId)
      .maybeSingle();

    if (!sourceError && sourceRow?.user_id) {
      collectionOwnerUserId = sourceRow.user_id;
      const ownerNameResult = await fetchPublicUserDisplayName(
        supabase,
        collectionOwnerUserId,
      );
      collectionOwnerDisplayName = ownerNameResult.isOk() ? ownerNameResult.value : "Someone";
    }
  }

  return ok({
    invite: data,
    senderDisplayName,
    collectionOwnerUserId,
    collectionOwnerDisplayName,
  });
}

async function releaseShareInviteClaimReservation(
  inviteId: string,
  supabase = createServiceRoleClient(),
) {
  await supabase
    .from("achievement_share_invites")
    .update({
      status: "pending",
      claimed_by_user_id: null,
      claimed_at: null,
    })
    .eq("id", inviteId);
}

export async function claimAchievementShareInvite(args: {
  token: string;
  claimerUserId: string;
  autoAccept: boolean;
}): Promise<Result<ClaimAchievementShareInviteSuccess, string>> {
  const supabase = createServiceRoleClient();
  const tokenHash = hashAchievementShareInviteToken(args.token);
  const claimedAt = new Date().toISOString();

  const { data: reservedInvite, error: reserveError } = await supabase
    .from("achievement_share_invites")
    .update({
      status: "claiming",
      claimed_by_user_id: args.claimerUserId,
      claimed_at: claimedAt,
    })
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (reserveError) {
    return err(reserveError.message);
  }
  if (!reservedInvite) {
    return err("This invite is no longer available.");
  }
  if (getAchievementShareInviteKind(reservedInvite) === "showcase") {
    await releaseShareInviteClaimReservation(reservedInvite.id, supabase);
    return err("This shared achievement is showcase-only.");
  }
  if (reservedInvite.sender_user_id === args.claimerUserId) {
    await releaseShareInviteClaimReservation(reservedInvite.id, supabase);
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
    await releaseShareInviteClaimReservation(reservedInvite.id, supabase);
    return err(
      cloneError instanceof Error
        ? cloneError.message
        : "Could not copy the shared 3D badge for your collection.",
    );
  }

  const { data: createdAchievement, error: createError } = await supabase
    .from("achievements")
    .insert(
      buildClaimedAchievementInsertFromInvite({
        invite: reservedInvite,
        claimerUserId: args.claimerUserId,
        iconUrl: claimedIconUrl,
        iconAssetPath: claimedIconAssetPath,
        achievedAt,
        dedicationStatus,
      }),
    )
    .select("id")
    .maybeSingle();

  if (createError) {
    await releaseShareInviteClaimReservation(reservedInvite.id, supabase);
    return err(
      formatSupabaseSingleRowError(createError, "Could not claim this invite."),
    );
  }
  if (!createdAchievement?.id) {
    await releaseShareInviteClaimReservation(reservedInvite.id, supabase);
    return err("Could not claim this invite.");
  }

  await supabase
    .from("achievement_share_invites")
    .update({
      status: "claimed",
      claimed_achievement_id: createdAchievement.id,
      claimed_by_user_id: args.claimerUserId,
      claimed_at: claimedAt,
    })
    .eq("id", reservedInvite.id);

  if (args.autoAccept) {
    await notifyDedicationAccepted({
      achievementId: createdAchievement.id,
      supabase,
    });
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

