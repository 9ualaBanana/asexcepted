import { hashAchievementShareInviteToken } from "@/lib/share-invites/token";
import { err, ok, type Result } from "neverthrow";
import type { ServiceRoleSupabaseClient } from "@/lib/supabase/clients/client-types";
import {
  parseAchievementShareInviteCreateV2,
  type AchievementShareInviteCreate,
  type AchievementShareInviteCreateV2,
  type AchievementSharePageKind,
} from "@/lib/achievements/domain/share-invite";
import type { Achievement } from "../domain/achievement";
import { formatSupabaseSingleRowError } from "@/lib/supabase/postgrest-errors";

export async function getAchievementShareInviteByToken(
	supabase: ServiceRoleSupabaseClient,
	token: string,
): Promise<Result<AchievementShareInviteCreate, string>> {
	const tokenHash = hashAchievementShareInviteToken(token);
	const { data, error } = await supabase
		.from("achievement_share_invites")
		.select("*")
		.eq("token_hash", tokenHash)
		.maybeSingle();

	if (error || !data) {
		return err(error?.message ?? "Could not find the share invite.");
	}
	return ok(data);
}

export async function getAchievementShareInviteByTokenV2(
  supabase: ServiceRoleSupabaseClient,
  token: string,
): Promise<Result<AchievementShareInviteCreateV2, string>> {
  const tokenHash = hashAchievementShareInviteToken(token);
  const { data, error } = await supabase
    .from("achievement_share_invites_v2")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) {
    return err(error?.message ?? "Could not find the share invite.");
  }
  return parseAchievementShareInviteCreateV2(data);
}

export async function createShareInvite(
  supabase: ServiceRoleSupabaseClient,
  args: {
    senderUserId: string;
    snapshot: Achievement;
    shareKind: AchievementSharePageKind;
    token: string;
  },
): Promise<Result<{ inviteId: string }, string>> {
  const { data, error } = await supabase
    .from("achievement_share_invites")
    .insert({
      sender_user_id: args.senderUserId,
      source_achievement_id: args.snapshot.id,
      share_kind: args.shareKind,
      title: args.snapshot.title,
      description: args.snapshot.description,
      category: args.snapshot.category,
      icon: args.snapshot.icon,
      // Checked in validateShareInviteBadgeSnapshot
      icon_url: args.snapshot.icon_url!,
      icon_file_id: args.snapshot.icon_file_id,
      icon_asset_kind: args.snapshot.icon_asset_kind,
      icon_asset_path: args.snapshot.icon_asset_path,
      icon_cc_attribution: args.snapshot.icon_cc_attribution,
      icon_model_yaw: args.snapshot.icon_model_yaw,
      icon_model_pitch: args.snapshot.icon_model_pitch,
      tone: args.snapshot.tone,
      achieved_at: args.snapshot.achieved_at,
      token_hash: hashAchievementShareInviteToken(args.token),
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
  return ok({ inviteId: data.id });
}

export async function createShareInviteV2(
  supabase: ServiceRoleSupabaseClient,
  args: {
    senderUserId: string;
    snapshot: Achievement;
    shareKind: AchievementSharePageKind;
    token: string;
  },
): Promise<Result<{ inviteId: string }, string>> {
  const { data, error } = await supabase
    .from("achievement_share_invites_v2")
    .insert({
      sender_user_id: args.senderUserId,
      source_achievement_id: args.snapshot.id,
      share_kind: args.shareKind,
      token_hash: hashAchievementShareInviteToken(args.token),
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
  return ok({ inviteId: data.id });
}

export async function deleteShareInvite(
  supabase: ServiceRoleSupabaseClient,
  inviteId: string,
): Promise<Result<void, string>> {
  const { error } = await supabase
    .from("achievement_share_invites")
    .delete()
    .eq("id", inviteId);

  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}

export async function reserveShareInviteClaim(
  supabase: ServiceRoleSupabaseClient,
	claimerUserId: string,
  token: string,
	claimedAt: string,
): Promise<Result<AchievementShareInviteCreate, string>> {
	const { data: reservedInvite, error: reserveError } = await supabase
	.from("achievement_share_invites")
	.update({
		status: "claiming",
		claimed_by_user_id: claimerUserId,
		claimed_at: claimedAt,
	})
	.eq("token_hash", hashAchievementShareInviteToken(token))
	.eq("status", "pending")
	.select("*")
	.maybeSingle();

if (reserveError) {
	return err(reserveError.message);
}
if (!reservedInvite) {
	return err("This invite is no longer available.");
}

  return ok(reservedInvite);
}

export async function completeShareInviteClaim(
  supabase: ServiceRoleSupabaseClient,
  inviteId: string,
  claimedAchievementId: string,
  claimedByUserId: string,
  claimedAt: string,
): Promise<Result<void, string>> {
  const { error } = await supabase
    .from("achievement_share_invites")
    .update({
      status: "claimed",
      claimed_achievement_id: claimedAchievementId,
      claimed_by_user_id: claimedByUserId,
      claimed_at: claimedAt,
    })
    .eq("id", inviteId);

  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}

export async function releaseShareInviteClaim(
	supabase: ServiceRoleSupabaseClient,
  inviteId: string,
): Promise<Result<void, string>> {
  const { error } = await supabase
    .from("achievement_share_invites")
    .update({
      status: "pending",
      claimed_by_user_id: null,
      claimed_at: null,
    })
    .eq("id", inviteId);

  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}