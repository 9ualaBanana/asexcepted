import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";

import { normalizeBadgeIconUrl } from "@/lib/achievements/badge/shared/badge-assets";
import {
  feedRowSourceToViewModel,
  type AchievementFeedItemViewModel,
  type FeedEventType,
} from "@/lib/achievements/data/achievement-surface-view-models";

export type { AchievementFeedItemViewModel, FeedEventType } from "@/lib/achievements/data/achievement-surface-view-models";
/** @deprecated Use AchievementFeedItemViewModel */
export type { FeedRow, FeedUnlockRow } from "@/lib/achievements/data/achievement-surface-view-models";

export type FeedCursor = {
  updated_at: string;
  id: string;
};

export type FeedPage = {
  rows: AchievementFeedItemViewModel[];
  nextCursor: FeedCursor | null;
};

function normalizeFeedRow(raw: Record<string, unknown>): AchievementFeedItemViewModel | null {
  const rawType = raw.event_type;
  const eventType: FeedEventType | null =
    rawType === "impression"
      ? "impression"
      : rawType === "dedication"
        ? "dedication"
        : rawType === "unlock" || rawType === undefined || rawType === null
          ? "unlock"
          : null;
  if (!eventType) {
    return null;
  }

  const eventId = raw.event_id ?? raw.achievement_id;
  if (typeof eventId !== "string") return null;

  return feedRowSourceToViewModel({
    event_type: eventType,
    event_id: eventId,
    achievement_id: String(raw.achievement_id),
    user_id: String(raw.user_id),
    actor_user_id: String(raw.actor_user_id ?? raw.user_id),
    actor_display_name: String(raw.actor_display_name ?? ""),
    actor_avatar_url: (raw.actor_avatar_url as string | null) ?? null,
    title: (raw.title as string | null) ?? null,
    description: (raw.description as string | null) ?? null,
    category: (raw.category as string | null) ?? null,
    icon: String(raw.icon ?? "trophy"),
    icon_url: normalizeBadgeIconUrl(raw.icon_url as string | null | undefined),
    icon_asset_kind: String(raw.icon_asset_kind ?? "image"),
    tone: String(raw.tone ?? "teal"),
    achieved_at: (raw.achieved_at as string | null) ?? null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
    event_at: String(raw.event_at ?? raw.updated_at),
    is_dedicated: eventType === "dedication" || Boolean(raw.is_dedicated),
  });
}

export async function fetchFollowingUnlockFeed(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    cursor?: FeedCursor | null;
  } = {},
): Promise<Result<FeedPage, string>> {
  const limit = options.limit ?? 20;
  const cursor = options.cursor ?? null;

  const { data, error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("following_unlock_feed", {
    p_limit: limit,
    p_cursor_updated_at: cursor?.updated_at ?? null,
    p_cursor_id: cursor?.id ?? null,
  });

  if (error) {
    return err(error.message);
  }

  const rows = (Array.isArray(data) ? data : [])
    .map((row) =>
      normalizeFeedRow(
        typeof row === "object" && row !== null
          ? (row as Record<string, unknown>)
          : {},
      ),
    )
    .filter((row): row is AchievementFeedItemViewModel => row !== null);

  const last = rows[rows.length - 1];
  const nextCursor =
    rows.length >= limit && last
      ? { updated_at: last.eventAt, id: last.eventId }
      : null;

  return ok({ rows, nextCursor });
}
