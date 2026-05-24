import type { SupabaseClient } from "@supabase/supabase-js";

/** User ids the current user follows (for feed unlock filtering). */
export async function fetchFollowingUserIds(
  supabase: SupabaseClient,
  followerId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("profile_follow")
    .select("following_id")
    .eq("follower_id", followerId);

  if (error || !data) {
    return new Set();
  }

  return new Set(data.map((row) => row.following_id));
}
