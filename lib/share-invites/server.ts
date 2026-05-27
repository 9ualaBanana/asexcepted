import "server-only";

import { err, ok, type Result } from "neverthrow";

import type { AchievementDbWritePayload } from "@/components/achievements/achievement-db-schema";
import { todayDateString } from "@/components/achievements/achievement-editor-shared";
import {
  isModelBadgeAssetKind,
  isPublicHttpImageUrl,
  sanitizeAchievementBadgeAssetPath,
} from "@/lib/achievements/badge-assets";
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

export type { AchievementShareInviteSnapshot };

type AchievementShareInviteRow = Tables<"achievement_share_invites">;
type AchievementRow = Tables<"achievements">;

const COLLECTION_ACHIEVEMENT_SNAPSHOT_SELECT =
  "id,user_id,title,description,category,icon,icon_url,icon_file_id,icon_asset_kind,icon_asset_path,icon_cc_attribution,icon_model_yaw,icon_model_pitch,tone,achieved_at,dedicated_by_user_id" as const;

export type AchievementShareInvitePresentation = {
  invite: AchievementShareInviteRow;
  senderDisplayName: string;
};

export type AchievementSharePageKind = "invite" | "showcase";

/** How an existing achievement is shared via invite link. */
export type AchievementShareInviteIntent = "showcase" | "dedicate";

export type ClaimAchievementShareInviteSuccess = {
  achievementId: string;
  redirectPath: string;
};

export function isAchievementEligibleForShareInvite(
  payload: Pick<AchievementDbWritePayload, "icon_url">,
) {
  return Boolean(payload.icon_url?.trim());
}

function validateShareInviteBadgeSnapshot(
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

export function getAchievementShareInviteKind(
  invite: Pick<AchievementShareInviteRow, "share_kind" | "source_achievement_id">,
): AchievementSharePageKind {
  return invite.share_kind === "showcase" ? "showcase" : "invite";
}

export function getAchievementShareInviteOwnerDetailPath(
  invite: Pick<AchievementShareInviteRow, "sender_user_id" | "source_achievement_id">,
) {
  const sourceAchievementId = invite.source_achievement_id?.trim();
  if (!sourceAchievementId) {
    return null;
  }

  return userAchievementDetail(invite.sender_user_id, sourceAchievementId);
}

async function finalizeInviteBadgeAssetsOnRow(args: {
  supabase: ReturnType<typeof createServiceRoleClient>;
  inviteId: string;
  senderUserId: string;
  snapshot: AchievementShareInviteSnapshot;
}): Promise<Result<AchievementShareInviteSnapshot, string>> {
  if (!isModelBadgeAssetKind(args.snapshot.icon_asset_kind)) {
    return ok({ ...args.snapshot });
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
    const { error: pinUpdateError } = await args.supabase
      .from("achievement_share_invites")
      .update({
        icon_url: pinned.iconUrl,
        icon_asset_path: pinned.iconAssetPath,
        badge_assets_pinned_at: pinnedAt,
      })
      .eq("id", args.inviteId);

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
    .single();

  if (error) {
    return err(error.message);
  }

  const finalized = await finalizeInviteBadgeAssetsOnRow({
    supabase,
    inviteId: data.id,
    senderUserId: args.senderUserId,
    snapshot: args.snapshot,
  });
  if (finalized.isErr()) {
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
    .eq("user_id", args.senderUserId)
    .single();

  if (error) {
    return err(error.message);
  }

  const achievement = data as Pick<AchievementRow, "id" | "dedicated_by_user_id"> &
    Parameters<typeof shareInviteSnapshotFromAchievementRow>[0];

  if (achievement.dedicated_by_user_id) {
    return err("Dedicated achievements cannot be re-shared.");
  }

  const snapshot = shareInviteSnapshotFromAchievementRow(achievement);

  if (args.intent === "showcase") {
    return insertShareInviteWithSnapshot({
      senderUserId: args.senderUserId,
      snapshot,
      sourceAchievementId: achievement.id,
      shareKind: "showcase",
    });
  }

  const inviteResult = await insertShareInviteWithSnapshot({
    senderUserId: args.senderUserId,
    snapshot,
    sourceAchievementId: null,
    shareKind: "invite",
  });

  if (inviteResult.isErr()) {
    return inviteResult;
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

  const nameResult = await fetchPublicUserDisplayName(supabase, data.sender_user_id);
  return ok({
    invite: data,
    senderDisplayName: nameResult.isOk() ? nameResult.value : "Someone",
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
    .single();

  if (createError || !createdAchievement?.id) {
    await releaseShareInviteClaimReservation(reservedInvite.id, supabase);
    return err(createError?.message ?? "Could not claim this invite.");
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

