import type { SupabaseClient } from "@supabase/supabase-js";

import { isAuthUserIdSegment } from "@/lib/user-achievements-path";
import {
  authUserExists,
  fetchPublicUserDisplayName,
} from "@/lib/user-profile-db";
import type { Database } from "@/lib/supabase/database.types";

export type ResolveAchievementsProfileUserResult =
  | { status: "invalid-id" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      userId: string;
      isOwner: boolean;
      publicDisplayName: string | null;
    };

/**
 * Validates `/u/[userId]` segment and confirms the auth user exists before the page
 * loads achievements or follow UI.
 */
export async function resolveAchievementsProfileUser(
  supabase: SupabaseClient<Database>,
  rawUserId: string,
  viewerUserId: string | null,
): Promise<ResolveAchievementsProfileUserResult> {
  const userId = rawUserId.trim();
  if (!isAuthUserIdSegment(userId)) {
    return { status: "invalid-id" };
  }

  const existsResult = await authUserExists(supabase, userId);
  if (existsResult.isErr()) {
    return { status: "error", message: existsResult.error };
  }
  if (!existsResult.value) {
    return { status: "not-found" };
  }

  const isOwner = viewerUserId === userId;
  if (isOwner) {
    return { status: "ok", userId, isOwner: true, publicDisplayName: null };
  }

  const labelResult = await fetchPublicUserDisplayName(supabase, userId);
  if (labelResult.isErr()) {
    return { status: "error", message: labelResult.error };
  }

  return {
    status: "ok",
    userId,
    isOwner: false,
    publicDisplayName: labelResult.value,
  };
}
