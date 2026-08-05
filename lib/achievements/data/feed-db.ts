import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";
import type { ZodError } from "zod";

import {
  feedRpcRowToViewModel,
  followingUnlockFeedRowsSchema,
  type AchievementFeedItemViewModel,
  type FeedEventType,
} from "@/lib/achievements/data/achievement-surface-view-models";

export type { AchievementFeedItemViewModel, FeedEventType } from "@/lib/achievements/data/achievement-surface-view-models";

export type FeedCursor = {
  updated_at: string;
  id: string;
};

export type FeedPage = {
  rows: AchievementFeedItemViewModel[];
  nextCursor: FeedCursor | null;
};

function formatFeedRowsError(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid feed response.";
  const path = issue.path.length > 0 ? issue.path.join(".") : "root";
  return `Invalid feed response at ${path}: ${issue.message}`;
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

  const parsed = followingUnlockFeedRowsSchema.safeParse(data ?? []);
  if (!parsed.success) {
    return err(formatFeedRowsError(parsed.error));
  }

  const rows = parsed.data.map(feedRpcRowToViewModel);
  const last = rows[rows.length - 1];
  const nextCursor =
    rows.length >= limit && last
      ? { updated_at: last.eventAt, id: last.eventId }
      : null;

  return ok({ rows, nextCursor });
}
