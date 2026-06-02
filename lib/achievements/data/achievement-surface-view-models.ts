import type { LucideIcon } from "lucide-react";

import {
  type AchievementTone,
  getSafeTone,
} from "@/components/achievements/achievement-manager-utils";
import {
  type AchievementIconAssetKind,
  type AchievementIconKey,
  getSafeIcon,
  getSafeIconAssetKind,
  getSafeIconKey,
} from "@/components/achievements/achievement-editor-shared";
import {
  isModelGlbAsset,
  isModelBadgeAssetKind,
  normalizeBadgeIconUrl,
} from "@/lib/achievements/badge/shared/badge-assets";
import { toOptimizedRenderSrc } from "@/lib/achievements/badge/shared/render-src";

export type FeedEventType = "unlock" | "impression" | "dedication";

/** Following-feed row with badge display fields normalized for UI. */
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
  FallbackIcon: LucideIcon;
  showDedicatedGlitter: boolean;
  isDedicated: boolean;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
  eventAt: string;
};

/** Embed iframe badge (model + poster fields). */
export type AchievementEmbedBadgeViewModel = {
  renderSrc: string;
  iconAssetPath: string | null;
  isModelBadge: boolean;
  iconModelYaw: number;
  iconModelPitch: number;
};

/** Embed token mint eligibility (owner must have badge art). */
export type AchievementEmbedMintViewModel = {
  achievementId: string;
  renderSrc: string;
};

/** Share-invite / showcase page badge rendering. */
export type AchievementShareInviteBadgeViewModel = {
  /** Persisted badge URL (not ImageKit-optimized). */
  iconUrl: string | null;
  renderSrc: string;
  iconAssetKind: AchievementIconAssetKind;
  iconAssetPath: string | null;
  iconModelYaw: number;
  iconModelPitch: number;
  iconCcAttribution: string | null;
  isModelBadge: boolean;
  showAttributionPopover: boolean;
};

type FeedRowSource = {
  event_type: FeedEventType;
  event_id: string;
  achievement_id: string;
  user_id: string;
  actor_user_id: string;
  actor_display_name: string;
  actor_avatar_url: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: string;
  icon_url: string | null;
  icon_asset_kind: string;
  tone: string;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
  event_at: string;
  is_dedicated: boolean;
};

type EmbedBadgeRowSource = {
  icon_url: string | null;
  icon_asset_kind: string | null;
  icon_asset_path: string | null;
  icon_model_yaw: number | null;
  icon_model_pitch: number | null;
};

type ShareInviteBadgeRowSource = {
  icon_url: string | null;
  icon_asset_kind: string | null;
  icon_asset_path: string | null;
  icon_model_yaw: number | null;
  icon_model_pitch: number | null;
  icon_cc_attribution: string | null;
};

export function feedRowSourceToViewModel(row: FeedRowSource): AchievementFeedItemViewModel {
  const iconUrl = row.icon_url;
  const iconAssetKind = getSafeIconAssetKind(row.icon_asset_kind);
  const displaySrc = iconUrl ? toOptimizedRenderSrc(iconUrl) : null;
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
    icon: getSafeIconKey(row.icon),
    displaySrc,
    tone: getSafeTone(row.tone),
    FallbackIcon: getSafeIcon(row.icon),
    showDedicatedGlitter:
      isDedicated && !isModelBadgeAssetKind(iconAssetKind) && iconUrl !== null,
    isDedicated,
    achievedAt: row.achieved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    eventAt: row.event_at,
  };
}

export function embedBadgeRowToViewModel(row: EmbedBadgeRowSource): AchievementEmbedBadgeViewModel | null {
  const iconUrl = normalizeBadgeIconUrl(row.icon_url);
  if (!iconUrl) return null;

  const iconAssetKind = getSafeIconAssetKind(row.icon_asset_kind);
  const iconAssetPath =
    typeof row.icon_asset_path === "string" ? row.icon_asset_path.trim() || null : null;

  return {
    renderSrc: toOptimizedRenderSrc(iconUrl),
    iconAssetPath,
    isModelBadge: isModelGlbAsset(iconAssetKind, iconAssetPath),
    iconModelYaw: Number(row.icon_model_yaw) || 0,
    iconModelPitch: Number(row.icon_model_pitch) || 0,
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
    renderSrc: toOptimizedRenderSrc(iconUrl),
  };
}

export function shareInviteRowToBadgeViewModel(
  row: ShareInviteBadgeRowSource,
): AchievementShareInviteBadgeViewModel {
  const iconUrl = normalizeBadgeIconUrl(row.icon_url);
  const iconAssetKind = getSafeIconAssetKind(row.icon_asset_kind);
  const iconAssetPath =
    typeof row.icon_asset_path === "string" ? row.icon_asset_path.trim() || null : null;
  const iconCcAttribution =
    typeof row.icon_cc_attribution === "string"
      ? row.icon_cc_attribution.trim() || null
      : null;

  return {
    iconUrl,
    renderSrc: iconUrl ? toOptimizedRenderSrc(iconUrl) : "",
    iconAssetKind,
    iconAssetPath,
    iconModelYaw: Number(row.icon_model_yaw) || 0,
    iconModelPitch: Number(row.icon_model_pitch) || 0,
    iconCcAttribution,
    isModelBadge: isModelGlbAsset(iconAssetKind, iconAssetPath),
    showAttributionPopover:
      isModelBadgeAssetKind(iconAssetKind) && Boolean(iconCcAttribution),
  };
}

/** @deprecated Use {@link AchievementFeedItemViewModel}. */
export type FeedRow = AchievementFeedItemViewModel;

/** @deprecated Use {@link AchievementFeedItemViewModel}. */
export type FeedUnlockRow = AchievementFeedItemViewModel;
