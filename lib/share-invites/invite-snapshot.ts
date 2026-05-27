import type { AchievementDbWritePayload } from "@/components/achievements/achievement-db-schema";
import type { Tables } from "@/lib/supabase/database.types";

type AchievementRow = Tables<"achievements">;
type AchievementShareInviteRow = Tables<"achievement_share_invites">;

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

/** Fields copied from a collection achievement into `achievement_share_invites`. */
export type CollectionAchievementSnapshotSource = Pick<
  AchievementRow,
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

export function shareInviteSnapshotFromAchievementRow(
  achievement: CollectionAchievementSnapshotSource,
): AchievementShareInviteSnapshot {
  return {
    title: achievement.title,
    description: achievement.description,
    category: achievement.category,
    icon: achievement.icon ?? "trophy",
    icon_url: achievement.icon_url ?? "",
    icon_file_id: achievement.icon_file_id,
    icon_asset_kind: achievement.icon_asset_kind,
    icon_asset_path: achievement.icon_asset_path,
    icon_cc_attribution: achievement.icon_cc_attribution,
    icon_model_yaw: achievement.icon_model_yaw ?? 0,
    icon_model_pitch: achievement.icon_model_pitch ?? 0,
    tone: achievement.tone,
    achieved_at: achievement.achieved_at,
  };
}

export function shareInviteSnapshotFromWritePayload(
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

/** Recipient collection row built only from the invite snapshot (after badge clone). */
export function buildClaimedAchievementInsertFromInvite(args: {
  invite: AchievementShareInviteRow;
  claimerUserId: string;
  iconUrl: string;
  iconAssetPath: string | null;
  achievedAt: string;
  dedicationStatus: "accepted" | "pending";
}) {
  return {
    user_id: args.claimerUserId,
    title: args.invite.title,
    description: args.invite.description,
    category: args.invite.category,
    icon: args.invite.icon,
    icon_url: args.iconUrl,
    icon_file_id: args.invite.icon_file_id,
    icon_asset_kind: args.invite.icon_asset_kind,
    icon_asset_path: args.iconAssetPath,
    icon_cc_attribution: args.invite.icon_cc_attribution,
    icon_model_yaw: args.invite.icon_model_yaw ?? 0,
    icon_model_pitch: args.invite.icon_model_pitch ?? 0,
    tone: args.invite.tone,
    is_locked: true,
    achieved_at: args.achievedAt,
    visibility: "public" as const,
    dedicated_by_user_id: args.invite.sender_user_id,
    dedication_status: args.dedicationStatus,
  };
}
