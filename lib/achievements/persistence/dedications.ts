import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";

import {
  parseAchievement,
  parseAchievements,
  type Achievement,
  type AchievementCreate,
} from "@/lib/achievements/domain/achievement";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const ACHIEVEMENT_FULL_SELECT =
  "id,title,description,category,icon,icon_url,icon_file_id,icon_asset_kind,icon_asset_path,icon_cc_attribution,icon_model_yaw,icon_model_pitch,icon_model_animation_play,icon_model_animation_speed,tone,is_locked,achieved_at,created_at,visibility,dedicated_by_user_id,dedication_status";

export type DedicatedAchievementRow = {
  id: string;
  title: string | null;
};

export async function listPendingDedications(
  supabase: Client,
  recipientUserId: string,
): Promise<Result<Achievement[], string>> {
  const { data, error } = await supabase
    .from("achievements")
    .select(ACHIEVEMENT_FULL_SELECT)
    .eq("user_id", recipientUserId)
    .eq("dedication_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return err(error.message);
  }

  return ok(parseAchievements(data ?? []));
}

export async function acceptPendingDedicationForRecipient(
  supabase: Client,
  achievementId: string,
  recipientUserId: string,
): Promise<Result<Achievement, string>> {
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

  const parsed = parseAchievement(data);
  if (parsed.isErr()) {
    return err(parsed.error);
  }
  return ok(parsed.value);
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
  create: AchievementCreate,
): Promise<Result<DedicatedAchievementRow, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .insert(create)
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
  create: AchievementCreate,
): Promise<Result<{ id: string }, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .insert(create)
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
