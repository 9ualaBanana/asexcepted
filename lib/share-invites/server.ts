import "server-only";

import { err, ok, type Result } from "neverthrow";

import type { AchievementDbWritePayload } from "@/components/achievements/achievement-db-schema";
import { todayDateString } from "@/components/achievements/achievement-editor-shared";
import type { Tables } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchPublicUserDisplayName } from "@/lib/user-profile-db";
import { notifyDedicationAccepted } from "@/lib/notifications/dedication-accepted";
import { userAchievementDetail } from "@/lib/routes";
import {
  createAchievementShareInviteToken,
  hashAchievementShareInviteToken,
} from "@/lib/share-invites/token";

type AchievementShareInviteRow = Tables<"achievement_share_invites">;
type AchievementRow = Tables<"achievements">;

export type AchievementShareInviteSnapshot = Pick<
  AchievementShareInviteRow,
  | "title"
  | "description"
  | "category"
  | "icon"
  | "icon_url"
  | "icon_file_id"
  | "icon_asset_kind"
  | "icon_asset_path"
  | "icon_cc_attribution"
  | "icon_model_yaw"
  | "icon_model_pitch"
  | "tone"
  | "achieved_at"
>;

export type AchievementShareInvitePresentation = {
  invite: AchievementShareInviteRow;
  senderDisplayName: string;
};

export type AchievementSharePageKind = "invite" | "showcase";

export type ClaimAchievementShareInviteSuccess = {
  achievementId: string;
  redirectPath: string;
};

function toShareInviteSnapshot(
  payload: AchievementDbWritePayload,
): AchievementShareInviteSnapshot {
  return {
    title: payload.title ?? null,
    description: payload.description ?? null,
    category: payload.category ?? null,
    icon: payload.icon ?? "trophy",
    icon_url: payload.icon_url ?? "",
    icon_file_id: payload.icon_file_id ?? null,
    icon_asset_kind: payload.icon_asset_kind ?? "image",
    icon_asset_path: payload.icon_asset_path ?? null,
    icon_cc_attribution: payload.icon_cc_attribution ?? null,
    icon_model_yaw: payload.icon_model_yaw ?? 0,
    icon_model_pitch: payload.icon_model_pitch ?? 0,
    tone: payload.tone ?? null,
    achieved_at: payload.achieved_at ?? null,
  };
}

export function isAchievementEligibleForShareInvite(
  payload: Pick<AchievementDbWritePayload, "icon_url">,
) {
  return Boolean(payload.icon_url?.trim());
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
  const snapshot = toShareInviteSnapshot(args.payload);
  if (!isAchievementEligibleForShareInvite(snapshot)) {
    return err("Only achievements with a custom badge image can be shared.");
  }

  const supabase = createServiceRoleClient();
  const token = createAchievementShareInviteToken();
  const tokenHash = hashAchievementShareInviteToken(token);

  const { data, error } = await supabase
    .from("achievement_share_invites")
    .insert({
      sender_user_id: args.senderUserId,
      source_achievement_id: args.sourceAchievementId ?? null,
      share_kind: args.sourceAchievementId ? "showcase" : "invite",
      title: snapshot.title,
      description: snapshot.description,
      category: snapshot.category,
      icon: snapshot.icon,
      icon_url: snapshot.icon_url,
      icon_file_id: snapshot.icon_file_id,
      icon_asset_kind: snapshot.icon_asset_kind,
      icon_asset_path: snapshot.icon_asset_path,
      icon_cc_attribution: snapshot.icon_cc_attribution,
      icon_model_yaw: snapshot.icon_model_yaw,
      icon_model_pitch: snapshot.icon_model_pitch,
      tone: snapshot.tone,
      achieved_at: snapshot.achieved_at,
      token_hash: tokenHash,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return err(error.message);
  }

  return ok({
    inviteId: data.id,
    token,
    snapshot,
  });
}

export async function createAchievementShareInviteFromExistingAchievement(args: {
  senderUserId: string;
  achievementId: string;
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
    .select(
      "id,user_id,title,description,category,icon,icon_url,icon_file_id,icon_asset_kind,icon_asset_path,icon_cc_attribution,icon_model_yaw,icon_model_pitch,tone,achieved_at,dedicated_by_user_id",
    )
    .eq("id", args.achievementId)
    .eq("user_id", args.senderUserId)
    .single();

  if (error) {
    return err(error.message);
  }

  const achievement = data as Pick<
    AchievementRow,
    | "id"
    | "user_id"
    | "title"
    | "description"
    | "category"
    | "icon"
    | "icon_url"
    | "icon_file_id"
    | "icon_asset_kind"
    | "icon_asset_path"
    | "icon_cc_attribution"
    | "icon_model_yaw"
    | "icon_model_pitch"
    | "tone"
    | "achieved_at"
    | "dedicated_by_user_id"
  >;

  if (achievement.dedicated_by_user_id) {
    return err("Dedicated achievements cannot be re-shared.");
  }

  return createAchievementShareInviteFromPayload({
    senderUserId: args.senderUserId,
    sourceAchievementId: achievement.id,
    payload: {
      title: achievement.title,
      description: achievement.description,
      category: achievement.category,
      icon: achievement.icon,
      icon_url: achievement.icon_url,
      icon_file_id: achievement.icon_file_id,
      icon_asset_kind: achievement.icon_asset_kind,
      icon_asset_path: achievement.icon_asset_path,
      icon_cc_attribution: achievement.icon_cc_attribution,
      icon_model_yaw: achievement.icon_model_yaw ?? 0,
      icon_model_pitch: achievement.icon_model_pitch ?? 0,
      tone: achievement.tone,
      achieved_at: achievement.achieved_at,
      is_locked: achievement.icon_url ? true : false,
      visibility: "public",
    },
  });
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

  const { data: createdAchievement, error: createError } = await supabase
    .from("achievements")
    .insert({
      user_id: args.claimerUserId,
      title: reservedInvite.title,
      description: reservedInvite.description,
      category: reservedInvite.category,
      icon: reservedInvite.icon,
      icon_url: reservedInvite.icon_url,
      icon_file_id: reservedInvite.icon_file_id,
      icon_asset_kind: reservedInvite.icon_asset_kind,
      icon_asset_path: reservedInvite.icon_asset_path,
      icon_cc_attribution: reservedInvite.icon_cc_attribution,
      icon_model_yaw: reservedInvite.icon_model_yaw ?? 0,
      icon_model_pitch: reservedInvite.icon_model_pitch ?? 0,
      tone: reservedInvite.tone,
      is_locked: true,
      achieved_at: achievedAt,
      visibility: "public",
      dedicated_by_user_id: reservedInvite.sender_user_id,
      dedication_status: dedicationStatus,
    })
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

