import type { SupabaseClient } from "@supabase/supabase-js";

import type { LiveUpdateSource } from "@/lib/live-updates/core/types";
import { createSupabasePostgresChangeSource } from "@/lib/live-updates/drivers/supabase/postgres-change-source";

const ACHIEVEMENTS_TABLE = "achievements";

export type CreateUserAchievementsLiveUpdateSourceOptions = {
  client: SupabaseClient;
  /** Collection owner (`auth.users.id`). */
  profileUserId: string;
};

/**
 * Invalidate a user's achievement grid when their `achievements` rows change
 * (new badge, unlock, edit, delete). Viewers on `/u/[userId]` use this while read-only.
 */
export function createUserAchievementsLiveUpdateSource(
  options: CreateUserAchievementsLiveUpdateSourceOptions,
): LiveUpdateSource {
  const { client, profileUserId } = options;
  const filter = `user_id=eq.${profileUserId}`;

  return createSupabasePostgresChangeSource({
    client,
    sourceId: `user-achievements:${profileUserId}`,
    channelName: `live-updates:user-achievements:${profileUserId}`,
    listeners: [
      { table: ACHIEVEMENTS_TABLE, filter, event: "INSERT" },
      { table: ACHIEVEMENTS_TABLE, filter, event: "UPDATE" },
      { table: ACHIEVEMENTS_TABLE, filter, event: "DELETE" },
    ],
  });
}
