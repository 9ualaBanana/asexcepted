import { z } from "zod";

import { normalizeBadgeIconUrl } from "@/lib/achievements/badge/shared/badge-assets";
import {
  achievementIconKeySchema,
  achievementToneSchema,
  iconAssetKindSchema,
  type AchievementIconKey,
  type AchievementTone,
} from "@/lib/achievements/data/achievement-enums";
import {
  isModelBadgeAssetKind,
  parseBadgeModelAsset,
  type BadgeModelAsset,
} from "@/lib/achievements/badge/shared/badge-model-asset";
import { showsDedicatedBadgeEffect } from "@/lib/achievements/dedication/dedication-utils";
import { toOptimizedRenderUrl } from "@/lib/imagekit/render-src";

export const FEED_EVENT_TYPES = ["unlock", "impression", "dedication"] as const;
export type FeedEventType = (typeof FEED_EVENT_TYPES)[number];

export type AchievementFeedItemViewModel = {
  eventType: FeedEventType;
  eventId: string;
  achievementId: string;
  userId: string;
  actorUserId: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: AchievementIconKey;
  displaySrc: string | null;
  tone: AchievementTone;
  showDedicatedEffect: boolean;
  isDedicated: boolean;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
  eventAt: string;
};

export type AchievementEmbedBadgeViewModel = {
  renderSrc: string | null;
  model: BadgeModelAsset | null;
};

export type AchievementEmbedMintViewModel = {
  achievementId: string;
  renderSrc: string | null;
};

export type AchievementShareInviteBadgeViewModel = {
  iconUrl: string | null;
  renderSrc: string | null;
  model: BadgeModelAsset | null;
  showAttributionPopover: boolean;
};

const uuidSchema = z.uuid();
const isoTimestampSchema = z.string().min(1);
const nullableTextSchema = z.string().nullable();

export const followingUnlockFeedRowSchema = z.object({
  event_type: z.enum(FEED_EVENT_TYPES),
  event_id: uuidSchema,
  achievement_id: uuidSchema,
  user_id: uuidSchema,
  actor_user_id: uuidSchema,
  actor_display_name: z.string(),
  actor_avatar_url: nullableTextSchema,
  title: nullableTextSchema,
  description: nullableTextSchema,
  category: nullableTextSchema,
  icon: achievementIconKeySchema,
  icon_url: nullableTextSchema,
  icon_file_id: nullableTextSchema,
  icon_asset_kind: iconAssetKindSchema,
  tone: achievementToneSchema,
  achieved_at: nullableTextSchema,
  created_at: isoTimestampSchema,
  updated_at: isoTimestampSchema,
  event_at: isoTimestampSchema,
  is_dedicated: z.boolean(),
});

export type FollowingUnlockFeedRow = z.infer<typeof followingUnlockFeedRowSchema>;

export const followingUnlockFeedRowsSchema = z.array(followingUnlockFeedRowSchema);

export function feedRpcRowToViewModel(
  row: FollowingUnlockFeedRow,
): AchievementFeedItemViewModel {
  const iconUrl = normalizeBadgeIconUrl(row.icon_url);
  const isDedicated = row.is_dedicated;
  return {
    eventType: row.event_type,
    eventId: row.event_id,
    achievementId: row.achievement_id,
    userId: row.user_id,
    actorUserId: row.actor_user_id,
    actorDisplayName: row.actor_display_name,
    actorAvatarUrl: row.actor_avatar_url,
    title: row.title,
    description: row.description,
    category: row.category,
    icon: row.icon,
    displaySrc: toOptimizedRenderUrl(iconUrl),
    tone: row.tone,
    showDedicatedEffect: showsDedicatedBadgeEffect(
      isDedicated,
      isModelBadgeAssetKind(row.icon_asset_kind),
    ),
    isDedicated,
    achievedAt: row.achieved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    eventAt: row.event_at,
  };
}

type EmbedBadgeRowSource = {
  icon_url: string | null;
  icon_asset_kind?: string | null;
  icon_asset_path?: string | null;
  icon_model_yaw?: number | null;
  icon_model_pitch?: number | null;
  icon_cc_attribution?: string | null;
  icon_model_animation_play?: boolean | null;
  icon_model_animation_speed?: number | null;
};

type ShareInviteBadgeRowSource = EmbedBadgeRowSource;

export function embedBadgeRowToViewModel(row: EmbedBadgeRowSource): AchievementEmbedBadgeViewModel | null {
  const iconUrl = normalizeBadgeIconUrl(row.icon_url);
  if (!iconUrl) return null;

  const model = parseBadgeModelAsset({
    iconAssetKind: row.icon_asset_kind,
    iconAssetPath: row.icon_asset_path,
    iconModelYaw: row.icon_model_yaw,
    iconModelPitch: row.icon_model_pitch,
    iconModelAnimationPlay: row.icon_model_animation_play,
    iconModelAnimationSpeed: row.icon_model_animation_speed,
    iconCcAttribution: row.icon_cc_attribution,
  });

  return {
    renderSrc: toOptimizedRenderUrl(iconUrl),
    model,
  };
}

export function embedMintRowToViewModel(
  achievementId: string,
  row: Pick<EmbedBadgeRowSource, "icon_url">,
): AchievementEmbedMintViewModel | null {
  const iconUrl = normalizeBadgeIconUrl(row.icon_url);
  if (!iconUrl) return null;
  return {
    achievementId,
    renderSrc: toOptimizedRenderUrl(iconUrl),
  };
}

export function shareInviteRowToBadgeViewModel(
  row: ShareInviteBadgeRowSource,
): AchievementShareInviteBadgeViewModel {
  const iconUrl = normalizeBadgeIconUrl(row.icon_url);
  const model = parseBadgeModelAsset({
    iconAssetKind: row.icon_asset_kind,
    iconAssetPath: row.icon_asset_path,
    iconModelYaw: row.icon_model_yaw,
    iconModelPitch: row.icon_model_pitch,
    iconModelAnimationPlay: row.icon_model_animation_play,
    iconModelAnimationSpeed: row.icon_model_animation_speed,
    iconCcAttribution: row.icon_cc_attribution,
  });

  return {
    iconUrl,
    renderSrc: toOptimizedRenderUrl(iconUrl),
    model,
    showAttributionPopover: Boolean(model?.ccAttribution),
  };
}
