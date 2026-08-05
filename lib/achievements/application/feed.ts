import {
  fetchFollowingUnlockFeed as fetchFollowingUnlockFeedPersistence,
  type FeedCursor,
  type FeedPage,
} from "@/lib/achievements/persistence/feed";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";
import type { Result } from "neverthrow";

export type { FeedCursor, FeedPage };

export async function fetchFollowingUnlockFeed(
  options: {
    limit?: number;
    cursor?: FeedCursor | null;
  } = {},
): Promise<Result<FeedPage, string>> {
  return fetchFollowingUnlockFeedPersistence(createBrowserSupabase(), options);
}
