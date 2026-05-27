import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AchievementDbRow,
  AchievementDbWritePayload,
} from "@/components/achievements/achievement-db-schema";
import { todayDateString } from "@/components/achievements/achievement-editor-shared";
import {
  normalizeAchievement,
  type AchievementRecord,
} from "@/components/achievements/achievement-transformers";
import {
  attachImpressionCounts,
  fetchImpressionCountMap,
} from "@/lib/achievements/impression-counts";
import { IMPRESSION_GLITTER_UI_ENABLED } from "@/lib/achievements/impression-glitter-feature";

export type { AchievementDbRow, AchievementDbWritePayload } from "@/components/achievements/achievement-db-schema";

export type AchievementListResult = Result<AchievementRecord[], string>;
export type AchievementSingleResult = Result<AchievementRecord, string>;
export type AchievementDeleteResult = Result<void, string>;

const SELECT_COLUMNS =
  "id,title,description,category,icon,icon_url,icon_file_id,icon_asset_kind,icon_asset_path,icon_cc_attribution,icon_model_yaw,icon_model_pitch,tone,is_locked,achieved_at,created_at,visibility,dedicated_by_user_id,dedication_status";

function toAchievementSingleResult(row: AchievementDbRow): AchievementSingleResult {
  try {
    return ok(normalizeAchievement(row as AchievementDbRow));
  } catch {
    return err("Invalid achievement data received from the server.");
  }
}

export async function listAchievements(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AchievementListResult> {
  const { data, error } = await supabase
    .from("achievements")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .or("dedication_status.is.null,dedication_status.eq.accepted")
    .order("achieved_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return err(error.message);
  }

  const rawRows = Array.isArray(data) ? data : [];
  try {
    const records = rawRows.map((row) =>
      normalizeAchievement(row as AchievementDbRow),
    );
    if (IMPRESSION_GLITTER_UI_ENABLED) {
      const countMap = await fetchImpressionCountMap(
        supabase,
        records.map((record) => record.id),
      );
      return ok(attachImpressionCounts(records, countMap));
    }
    return ok(records);
  } catch {
    return err("Invalid achievement data received from the server.");
  }
}

export async function createAchievement(
  supabase: SupabaseClient<Database>,
  payload: AchievementDbWritePayload,
): Promise<AchievementSingleResult> {
  const { data, error } = await supabase
    .from("achievements")
    .insert(payload)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    return err(error.message);
  }
  if (!data || typeof data === "string") {
    return err("Unexpected response while creating achievement.");
  }
  return toAchievementSingleResult(data);
}

export async function updateAchievement(
  supabase: SupabaseClient<Database>,
  achievementId: string,
  payload: AchievementDbWritePayload,
): Promise<AchievementSingleResult> {
  const { data, error } = await supabase
    .from("achievements")
    .update(payload)
    .eq("id", achievementId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    return err(error.message);
  }
  if (!data || typeof data === "string") {
    return err("Unexpected response while updating achievement.");
  }
  return toAchievementSingleResult(data);
}

export async function deleteAchievement(
  supabase: SupabaseClient<Database>,
  achievementId: string,
): Promise<AchievementDeleteResult> {
  const { error } = await supabase.from("achievements").delete().eq("id", achievementId);
  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}

export async function unlockAchievement(
  supabase: SupabaseClient<Database>,
  achievementId: string,
): Promise<AchievementSingleResult> {
  const { data: existing, error: readError } = await supabase
    .from("achievements")
    .select("achieved_at")
    .eq("id", achievementId)
    .single();

  if (readError) {
    return err(readError.message);
  }

  const patch: { is_locked: false; achieved_at?: string } = { is_locked: false };
  // Preserve user-set earned date; set today when unlocking so feed can surface the row.
  const row = existing as { achieved_at?: string | null } | null;
  if (!row?.achieved_at) {
    patch.achieved_at = todayDateString();
  }

  const { data, error } = await supabase
    .from("achievements")
    .update(patch)
    .eq("id", achievementId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    return err(error.message);
  }
  if (!data || typeof data === "string") {
    return err("Unexpected response while unlocking achievement.");
  }
  return toAchievementSingleResult(data);
}
