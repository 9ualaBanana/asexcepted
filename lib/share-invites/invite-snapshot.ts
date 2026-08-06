import type {
  AchievementCreate,
  AchievementWrite,
} from "@/lib/achievements/domain/achievement";
import type { Tables } from "@/lib/supabase/database.types";
import {
  DEFAULT_ACHIEVEMENT_ICON_KEY,
  DEFAULT_ACHIEVEMENT_TONE,
  type AchievementIconKey,
  type AchievementTone,
  type IconAssetKind,
} from "@/lib/achievements/domain/enums";

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

export type AchievementSnapshotSource = Pick<
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
  achievement: AchievementSnapshotSource,
): AchievementShareInviteSnapshot {
  return {
    title: achievement.title,
    description: achievement.description,
    category: achievement.category,
    icon: achievement.icon ?? DEFAULT_ACHIEVEMENT_ICON_KEY,
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
  write: AchievementWrite,
): AchievementShareInviteSnapshot {
  return {
    title: write.title ?? null,
    description: write.description ?? null,
    category: write.category ?? null,
    icon: write.icon ?? DEFAULT_ACHIEVEMENT_ICON_KEY,
    icon_url: write.icon_url ?? "",
    icon_file_id: write.icon_file_id ?? null,
    icon_asset_kind: write.icon_asset_kind ?? "image",
    icon_asset_path: write.icon_asset_path ?? null,
    icon_cc_attribution: write.icon_cc_attribution ?? null,
    icon_model_yaw: write.icon_model_yaw ?? 0,
    icon_model_pitch: write.icon_model_pitch ?? 0,
    tone: write.tone ?? null,
    achieved_at: write.achieved_at ?? null,
  };
}

export function buildClaimedAchievementCreateFromInvite(args: {
  invite: AchievementShareInviteRow;
  claimerUserId: string;
  iconUrl: string;
  iconAssetPath: string | null;
  achievedAt: string;
  dedicationStatus: "accepted" | "pending";
}): AchievementCreate {
  return {
    user_id: args.claimerUserId,
    title: args.invite.title,
    description: args.invite.description,
    category: args.invite.category,
    icon: (args.invite.icon ?? DEFAULT_ACHIEVEMENT_ICON_KEY) as AchievementIconKey,
    icon_url: args.iconUrl,
    icon_file_id: args.invite.icon_file_id,
    icon_asset_kind: (args.invite.icon_asset_kind ?? "image") as IconAssetKind,
    icon_asset_path: args.iconAssetPath,
    icon_cc_attribution: args.invite.icon_cc_attribution,
    icon_model_yaw: args.invite.icon_model_yaw ?? 0,
    icon_model_pitch: args.invite.icon_model_pitch ?? 0,
    tone: (args.invite.tone ?? DEFAULT_ACHIEVEMENT_TONE) as AchievementTone,
    is_locked: true,
    achieved_at: args.achievedAt,
    visibility: "public",
    dedicated_by_user_id: args.invite.sender_user_id,
    dedication_status: args.dedicationStatus,
  };
}
