import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";

import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import { tryNormalizeAchievement } from "@/components/achievements/achievement-transformers";
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

  const rows: AchievementRecord[] = [];
  for (const row of data ?? []) {
    const normalized = tryNormalizeAchievement(row as AchievementDbRow);
    if (normalized.isErr()) {
      return err(normalized.error);
    }
    rows.push(normalized.value);
  }
  return ok(rows);
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
    .maybeSingle();

  if (error) {
    return err(error.message);
  }
  if (!data) {
    return err("This dedication is no longer pending or was already accepted.");
  }

  const normalized = tryNormalizeAchievement(data as AchievementDbRow);
  if (normalized.isErr()) {
    return err(normalized.error);
  }
  return ok(normalized.value);
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
