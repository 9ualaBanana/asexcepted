import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";

import type { Database } from "@/lib/supabase/database.types";

export type FollowRelationshipResult = Result<boolean, string>;
export type FollowMutationResult = Result<void, string>;
export type PublicUserDisplayNameResult = Result<string | null, string>;

/**
 * Whether {@link followerId} follows {@link followingId} (row exists in `profile_follow`).
 */
export async function isUserFollowingProfile(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followingId: string,
): Promise<FollowRelationshipResult> {
  const { data, error } = await supabase
    .from("profile_follow")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) {
    return err(error.message);
  }
  return ok(Boolean(data));
}

export async function createProfileFollow(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followingId: string,
): Promise<FollowMutationResult> {
  const { error } = await supabase.from("profile_follow").insert({
    follower_id: followerId,
    following_id: followingId,
  });
  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}

export async function removeProfileFollow(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followingId: string,
): Promise<FollowMutationResult> {
  const { error } = await supabase
    .from("profile_follow")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}

/**
 * Public display name for a user id (RPC). Returns trimmed non-empty string, or `null` if unset/empty.
 */
export async function fetchPublicUserDisplayName(
  supabase: SupabaseClient<Database>,
  targetUserId: string,
): Promise<PublicUserDisplayNameResult> {
  const { data: label, error } = await supabase.rpc("public_user_display_name", {
    target_user_id: targetUserId,
  });

  if (error) {
    return err(error.message);
  }

  if (typeof label === "string") {
    const trimmed = label.trim();
    return ok(trimmed.length > 0 ? trimmed : null);
  }

  return ok(null);
}
