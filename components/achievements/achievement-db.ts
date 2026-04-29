import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];
type AchievementInsert = Database["public"]["Tables"]["achievements"]["Insert"];
type AchievementUpdate = Database["public"]["Tables"]["achievements"]["Update"];

export type AchievementDbRow = Pick<
  AchievementRow,
  | "id"
  | "title"
  | "description"
  | "category"
  | "icon"
  | "icon_url"
  | "icon_file_id"
  | "tone"
  | "is_locked"
  | "achieved_at"
  | "created_at"
>;

export type AchievementDbWritePayload = Pick<
  AchievementInsert,
  "title" | "description" | "category" | "icon" | "icon_url" | "icon_file_id" | "tone" | "is_locked" | "achieved_at"
>;

const SELECT_COLUMNS =
  "id,title,description,category,icon,icon_url,icon_file_id,tone,is_locked,achieved_at,created_at";

export async function listAchievementsByUser(
  supabase: SupabaseClient<Database>,
  ownerUserId: string,
) {
  return supabase
    .from("achievements")
    .select(SELECT_COLUMNS)
    .eq("user_id", ownerUserId)
    .order("achieved_at", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function createAchievement(
  supabase: SupabaseClient<Database>,
  payload: AchievementDbWritePayload,
) {
  return supabase
    .from("achievements")
    .insert(payload)
    .select(SELECT_COLUMNS)
    .single();
}

export async function updateAchievement(
  supabase: SupabaseClient<Database>,
  achievementId: string,
  payload: AchievementDbWritePayload,
) {
  const updatePayload: AchievementUpdate = payload;
  return supabase
    .from("achievements")
    .update(updatePayload)
    .eq("id", achievementId)
    .select(SELECT_COLUMNS)
    .single();
}

export async function deleteAchievement(
  supabase: SupabaseClient<Database>,
  achievementId: string,
) {
  return supabase.from("achievements").delete().eq("id", achievementId);
}

export async function unlockAchievement(
  supabase: SupabaseClient<Database>,
  achievementId: string,
) {
  return supabase
    .from("achievements")
    .update({ is_locked: false })
    .eq("id", achievementId)
    .select(SELECT_COLUMNS)
    .single();
}
