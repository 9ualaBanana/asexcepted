import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";

import { coerceAchievementDbRow } from "@/lib/achievements/data/achievement-transformers";
import {
  domainRowToDetailViewModel,
  type AchievementDetailViewModel,
} from "@/lib/achievements/data/achievement-view-models";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
type AchievementInsert = Database["public"]["Tables"]["achievements"]["Insert"];

const ACHIEVEMENT_FULL_SELECT =
  "id,title,description,category,icon,icon_url,icon_file_id,icon_asset_kind,icon_asset_path,icon_cc_attribution,icon_model_yaw,icon_model_pitch,icon_model_animation_play,icon_model_animation_speed,tone,is_locked,achieved_at,created_at,visibility,dedicated_by_user_id,dedication_status";

export type DedicatedAchievementRow = {
  id: string;
  title: string | null;
};

export async function listPendingDedications(
  supabase: Client,
  recipientUserId: string,
): Promise<Result<AchievementDetailViewModel[], string>> {
  const { data, error } = await supabase
    .from("achievements")
    .select(ACHIEVEMENT_FULL_SELECT)
    .eq("user_id", recipientUserId)
    .eq("dedication_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return err(error.message);
  }

  const details: AchievementDetailViewModel[] = [];
  for (const row of data ?? []) {
    details.push(domainRowToDetailViewModel(coerceAchievementDbRow(row as Record<string, unknown>)));
  }
  return ok(details);
}

export async function acceptPendingDedicationForRecipient(
  supabase: Client,
  achievementId: string,
  recipientUserId: string,
): Promise<Result<AchievementDetailViewModel, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .update({
      dedication_status: "accepted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", achievementId)
    .eq("user_id", recipientUserId)
    .eq("dedication_status", "pending")
    .select(ACHIEVEMENT_FULL_SELECT)
    .maybeSingle();

  if (error) {
    return err(error.message);
  }
  if (!data) {
    return err("This dedication is no longer pending or was already accepted.");
  }

  return ok(domainRowToDetailViewModel(coerceAchievementDbRow(data as Record<string, unknown>)));
}

export async function rejectDedication(
  supabase: Client,
  achievementId: string,
): Promise<Result<void, string>> {
  const { error } = await supabase
    .from("achievements")
    .delete()
    .eq("id", achievementId)
    .eq("dedication_status", "pending");

  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}

export async function insertDedicatedAchievement(
  supabase: Client,
  payload: AchievementInsert,
): Promise<Result<DedicatedAchievementRow, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .insert(payload)
    .select("id,title")
    .single();

  if (error) {
    return err(error.message);
  }
  if (!data) {
    return err("Could not create dedication.");
  }
  return ok(data);
}

export async function insertClaimedAchievementFromInvite(
  supabase: Client,
  payload: AchievementInsert,
): Promise<Result<{ id: string }, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    return err(error.message);
  }
  if (!data?.id) {
    return err("Could not create achievement from invite.");
  }
  return ok({ id: data.id });
}
