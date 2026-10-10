import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";
import type { ZodError } from "zod";

import {
  followingUnlockFeedEventsSchema,
  type FollowingUnlockFeedEvent,
} from "@/lib/achievements/domain/feed-event";
import type { FeedCursor, FeedEventPage } from "@/lib/achievements/application/ports";

export type { FeedCursor, FeedEventPage };

function formatFeedEventsError(error: ZodError): string {
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
): Promise<Result<FeedEventPage, string>> {
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

  const parsed = followingUnlockFeedEventsSchema.safeParse(data ?? []);
  if (!parsed.success) {
    return err(formatFeedEventsError(parsed.error));
  }

  const events: FollowingUnlockFeedEvent[] = parsed.data;
  const last = events[events.length - 1];
  const nextCursor =
    events.length >= limit && last
      ? { updated_at: last.event_at, id: last.event_id }
      : null;

  return ok({ events, nextCursor });
}
