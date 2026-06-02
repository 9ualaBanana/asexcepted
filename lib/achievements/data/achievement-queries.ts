import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";

import { normalizeBadgeIconUrl } from "@/lib/achievements/badge/shared/badge-assets";
import type { Database } from "@/lib/supabase/database.types";
import { formatSupabaseSingleRowError } from "@/lib/supabase/postgrest-errors";

type Client = SupabaseClient<Database>;

export type AchievementUnlockPushRow = {
  id: string;
  user_id: string;
  title: string | null;
  is_locked: boolean;
  visibility: Database["public"]["Tables"]["achievements"]["Row"]["visibility"];
};

export type AchievementEmbedBadgeRow = Pick<
  Database["public"]["Tables"]["achievements"]["Row"],
  "icon_url" | "icon_asset_kind" | "icon_asset_path" | "icon_model_yaw" | "icon_model_pitch"
>;

export type AchievementEmbedMintRow = Pick<
  Database["public"]["Tables"]["achievements"]["Row"],
  "id" | "icon_url"
>;

export type AchievementDedicationNotifyRow = Pick<
  Database["public"]["Tables"]["achievements"]["Row"],
  "id" | "user_id" | "title" | "dedicated_by_user_id" | "dedication_status"
>;

export type AchievementShareInviteSnapshotRow = Pick<
  Database["public"]["Tables"]["achievements"]["Row"],
  | "id"
  | "user_id"
  | "title"
  | "description"
  | "category"
  | "icon"
  | "icon_url"
  | "icon_file_id"
  | "icon_asset_kind"
  | "icon_asset_path"
  | "icon_cc_attribution"
  | "icon_model_yaw"
  | "icon_model_pitch"
  | "tone"
  | "achieved_at"
  | "visibility"
  | "dedicated_by_user_id"
>;

export async function getAchievementForUnlockPush(
  supabase: Client,
  achievementId: string,
): Promise<Result<AchievementUnlockPushRow, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .select("id,user_id,title,is_locked,visibility")
    .eq("id", achievementId)
    .single();

  if (error) {
    return err(formatSupabaseSingleRowError(error, "Achievement not found"));
  }
  if (!data) {
    return err("Achievement not found");
  }
  return ok(data);
}

export async function getAchievementEmbedBadgeById(
  supabase: Client,
  achievementId: string,
): Promise<Result<AchievementEmbedBadgeRow, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .select("icon_url,icon_asset_kind,icon_asset_path,icon_model_yaw,icon_model_pitch")
    .eq("id", achievementId)
    .maybeSingle();

  if (error) {
    return err(error.message);
  }
  if (!data) {
    return err("Achievement not found");
  }
  return ok({
    ...data,
    icon_url: normalizeBadgeIconUrl(data.icon_url),
  });
}

export async function getAchievementEmbedMintForOwner(
  supabase: Client,
  achievementId: string,
  ownerUserId: string,
): Promise<Result<AchievementEmbedMintRow, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .select("id,icon_url")
    .eq("id", achievementId)
    .eq("user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    return err(error.message);
  }
  if (!data) {
    return err("Achievement not found");
  }
  return ok({
    ...data,
    icon_url: normalizeBadgeIconUrl(data.icon_url),
  });
}

export async function getAchievementDedicationNotifyRow(
  supabase: Client,
  achievementId: string,
): Promise<Result<AchievementDedicationNotifyRow, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .select("id,user_id,title,dedicated_by_user_id,dedication_status")
    .eq("id", achievementId)
    .maybeSingle();

  if (error) {
    return err(error.message);
  }
  if (!data) {
    return err("Achievement not found");
  }
  return ok(data);
}

export async function getAchievementShareInviteSnapshotRow(
  supabase: Client,
  achievementId: string,
): Promise<Result<AchievementShareInviteSnapshotRow, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .select(
      "id,user_id,title,description,category,icon,icon_url,icon_file_id,icon_asset_kind,icon_asset_path,icon_cc_attribution,icon_model_yaw,icon_model_pitch,tone,achieved_at,visibility,dedicated_by_user_id",
    )
    .eq("id", achievementId)
    .maybeSingle();

  if (error) {
    return err(formatSupabaseSingleRowError(error, "This achievement could not be found."));
  }
  if (!data) {
    return err("This achievement could not be found.");
  }
  return ok(data);
}

export async function getAchievementIdForOwner(
  supabase: Client,
  achievementId: string,
  ownerUserId: string,
): Promise<Result<{ id: string }, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .select("id")
    .eq("id", achievementId)
    .eq("user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    return err(
      formatSupabaseSingleRowError(
        error,
        "Could not verify your achievement before completing the dedicate link.",
      ),
    );
  }
  if (!data) {
    return err(
      "This achievement is no longer in your collection. It may have already been dedicated.",
    );
  }
  return ok(data);
}

/** Returns owner user id, or `null` when the row is missing (not a DB failure). */
export async function getAchievementOwnerUserId(
  supabase: Client,
  achievementId: string,
): Promise<Result<string | null, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .select("user_id")
    .eq("id", achievementId)
    .maybeSingle();

  if (error) {
    return err(error.message);
  }
  return ok(data?.user_id ?? null);
}
