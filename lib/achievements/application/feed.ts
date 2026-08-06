import type { Result } from "neverthrow";

import { createFeedPort } from "@/lib/achievements/application/adapters";
import type { FeedCursor, FeedPort } from "@/lib/achievements/application/ports";
import {
  feedEventToViewModel,
  type AchievementFeedItemViewModel,
} from "@/lib/achievements/presentation/surface-view-models";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";

export type { FeedCursor };

export type FeedPage = {
  rows: AchievementFeedItemViewModel[];
  nextCursor: FeedCursor | null;
};

function defaultFeedPort(): FeedPort {
  return createFeedPort(createBrowserSupabase());
}

export async function loadFollowingUnlockFeed(
  options: {
    limit?: number;
    cursor?: FeedCursor | null;
  } = {},
  port: FeedPort = defaultFeedPort(),
): Promise<Result<FeedPage, string>> {
  const result = await port.fetchFollowingUnlock(options);
  return result.map((page) => ({
    rows: page.events.map(feedEventToViewModel),
    nextCursor: page.nextCursor,
  }));
}
