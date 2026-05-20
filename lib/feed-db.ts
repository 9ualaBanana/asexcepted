import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";

export type FeedUnlockRow = {
  achievement_id: string;
  user_id: string;
  actor_display_name: string;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: string;
  icon_url: string | null;
  icon_file_id: string | null;
  tone: string;
  achieved_at: string | null;
  created_at: string;
};

export type FeedPage = {
  rows: FeedUnlockRow[];
  nextCursor: { created_at: string; id: string } | null;
};

export async function fetchFollowingUnlockFeed(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    cursor?: { created_at: string; id: string } | null;
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
    p_cursor_created_at: cursor?.created_at ?? null,
    p_cursor_id: cursor?.id ?? null,
  });

  if (error) {
    return err(error.message);
  }

  const rows = (Array.isArray(data) ? data : []) as FeedUnlockRow[];
  const last = rows[rows.length - 1];
  const nextCursor =
    rows.length >= limit && last
      ? { created_at: last.created_at, id: last.achievement_id }
      : null;

  return ok({ rows, nextCursor });
}
