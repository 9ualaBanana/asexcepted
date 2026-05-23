import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";

import { normalizeImageKitFileId } from "@/components/achievements/badge/badge-imagekit-session";

export type ProfileRow = {
  user_id: string;
  avatar_url: string | null;
  avatar_file_id: string | null;
};

export type ProfileAvatarUpdate = {
  avatar_url: string | null;
  avatar_file_id: string | null;
};

export async function fetchProfileRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<Result<ProfileRow | null, string>> {
  const { data, error } = await supabase
    .from("profile")
    .select("user_id, avatar_url, avatar_file_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return err(error.message);
  }
  if (!data) {
    return ok(null);
  }

  return ok({
    user_id: data.user_id,
    avatar_url: data.avatar_url,
    avatar_file_id: normalizeImageKitFileId(data.avatar_file_id) || null,
  });
}

export async function updateProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  patch: ProfileAvatarUpdate,
): Promise<Result<void, string>> {
  const { error } = await supabase
    .from("profile")
    .update({
      avatar_url: patch.avatar_url,
      avatar_file_id: patch.avatar_file_id,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}
