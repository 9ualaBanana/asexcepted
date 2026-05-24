import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  LiveUpdateDispose,
  LiveUpdateNotify,
  LiveUpdateSource,
} from "@/lib/live-updates/core/types";
import { fetchFollowingUserIds } from "@/lib/live-updates/domains/feed/fetch-following-user-ids";
import { createSupabasePostgresChangeSource } from "@/lib/live-updates/drivers/supabase/postgres-change-source";

export type CreateFeedLiveUpdateSourceOptions = {
  client: SupabaseClient;
  userId: string;
};

const UNLOCK_TABLE = "achievement_unlock_events";
const IMPRESSION_TABLE = "achievement_impression_events";
const FOLLOW_TABLE = "profile_follow";

/**
 * Feed invalidation when:
 * - Someone you follow unlocks an achievement
 * - Someone leaves an impression on your achievement
 * - You follow someone new (following list changes)
 */
export function createFeedLiveUpdateSource(
  options: CreateFeedLiveUpdateSourceOptions,
): LiveUpdateSource {
  const { client, userId } = options;

  let followingIds = new Set<string>();

  const refreshFollowing = async () => {
    followingIds = await fetchFollowingUserIds(client, userId);
  };

  const inner = createSupabasePostgresChangeSource({
    client,
    sourceId: "feed",
    channelName: `live-updates:feed:${userId}`,
    listeners: [
      {
        table: IMPRESSION_TABLE,
        filter: `owner_user_id=eq.${userId}`,
      },
      {
        table: UNLOCK_TABLE,
      },
      {
        table: FOLLOW_TABLE,
        filter: `follower_id=eq.${userId}`,
      },
    ],
    shouldNotify: ({ table, new: rowNew, old: rowOld }) => {
      const row = rowNew ?? rowOld;
      if (table === IMPRESSION_TABLE) {
        return true;
      }
      if (table === UNLOCK_TABLE) {
        const ownerId = row?.owner_user_id;
        return typeof ownerId === "string" && followingIds.has(ownerId);
      }
      if (table === FOLLOW_TABLE) {
        void refreshFollowing();
        return true;
      }
      return false;
    },
  });

  return {
    sourceId: inner.sourceId,
    start(onNotify: LiveUpdateNotify): LiveUpdateDispose {
      let innerDispose: LiveUpdateDispose | null = null;
      let cancelled = false;

      void refreshFollowing().then(() => {
        if (cancelled) return;
        innerDispose = inner.start(onNotify);
      });

      return () => {
        cancelled = true;
        innerDispose?.();
      };
    },
  };
}
