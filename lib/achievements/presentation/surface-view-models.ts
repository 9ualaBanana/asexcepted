import { normalizeBadgeIconUrl } from "@/lib/achievements/badge/shared/badge-assets";
import {
  type AchievementIconKey,
  type AchievementTone,
} from "@/lib/achievements/domain/enums";
import {
  FEED_EVENT_TYPES,
  type FeedEventType,
  type FollowingUnlockFeedEvent,
  followingUnlockFeedEventSchema,
  followingUnlockFeedEventsSchema,
  type FollowingUnlockFeedRow,
  followingUnlockFeedRowSchema,
  followingUnlockFeedRowsSchema,
} from "@/lib/achievements/domain/feed-event";
import {
  isModelBadgeAssetKind,
  parseBadgeModelAsset,
  type BadgeModelAsset,
} from "@/lib/achievements/badge/shared/badge-model-asset";
import { toOptimizedRenderUrl } from "@/lib/imagekit/render-src";
import { showsDedicatedBadgeEffect } from "@/lib/achievements/presentation/collection-view-models";

export {
  FEED_EVENT_TYPES,
  type FeedEventType,
  type FollowingUnlockFeedEvent,
  followingUnlockFeedEventSchema,
  followingUnlockFeedEventsSchema,
  type FollowingUnlockFeedRow,
  followingUnlockFeedRowSchema,
  followingUnlockFeedRowsSchema,
};

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

export function feedEventToViewModel(
  event: FollowingUnlockFeedEvent,
): AchievementFeedItemViewModel {
  const iconUrl = normalizeBadgeIconUrl(event.icon_url);
  const isDedicated = event.is_dedicated;
  return {
    eventType: event.event_type,
    eventId: event.event_id,
    achievementId: event.achievement_id,
    userId: event.user_id,
    actorUserId: event.actor_user_id,
    actorDisplayName: event.actor_display_name,
    actorAvatarUrl: event.actor_avatar_url,
    title: event.title,
    description: event.description,
    category: event.category,
    icon: event.icon,
    displaySrc: toOptimizedRenderUrl(iconUrl),
    tone: event.tone,
    showDedicatedEffect: showsDedicatedBadgeEffect(
      isDedicated,
      isModelBadgeAssetKind(event.icon_asset_kind),
    ),
    isDedicated,
    achievedAt: event.achieved_at,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
    eventAt: event.event_at,
  };
}

/** @deprecated Use {@link feedEventToViewModel}. */
export function feedRpcRowToViewModel(
  row: FollowingUnlockFeedEvent,
): AchievementFeedItemViewModel {
  return feedEventToViewModel(row);
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
