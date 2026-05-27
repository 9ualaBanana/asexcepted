import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";

import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import { normalizeAchievement } from "@/components/achievements/achievement-transformers";
import type { AchievementDbRow } from "@/components/achievements/achievement-db-schema";

const PENDING_SELECT =
  "id,title,description,category,icon,icon_url,icon_file_id,icon_asset_kind,icon_asset_path,icon_cc_attribution,icon_model_yaw,icon_model_pitch,tone,is_locked,achieved_at,created_at,visibility,dedicated_by_user_id,dedication_status";

export async function listPendingDedications(
  supabase: SupabaseClient,
  recipientUserId: string,
): Promise<Result<AchievementRecord[], string>> {
  const { data, error } = await supabase
    .from("achievements")
    .select(PENDING_SELECT)
    .eq("user_id", recipientUserId)
    .eq("dedication_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return err(error.message);
  }

  try {
    const rows = (data ?? []).map((row) =>
      normalizeAchievement(row as AchievementDbRow),
    );
    return ok(rows);
  } catch {
    return err("Invalid dedication data received from the server.");
  }
}

export async function acceptDedication(
  supabase: SupabaseClient,
  achievementId: string,
): Promise<Result<AchievementRecord, string>> {
  const { data, error } = await supabase
    .from("achievements")
    .update({
      dedication_status: "accepted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", achievementId)
    .eq("dedication_status", "pending")
    .select(PENDING_SELECT)
    .single();

  if (error) {
    return err(error.message);
  }

  try {
    return ok(normalizeAchievement(data as AchievementDbRow));
  } catch {
    return err("Invalid dedication data received from the server.");
  }
}

export async function rejectDedication(
  supabase: SupabaseClient,
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
