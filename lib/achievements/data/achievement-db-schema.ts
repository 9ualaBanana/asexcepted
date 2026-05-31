import type { Database } from "@/lib/supabase/database.types";

type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];
type AchievementInsert = Database["public"]["Tables"]["achievements"]["Insert"];

export type AchievementDbRow = Pick<
  AchievementRow,
  | "id"
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
  | "icon_model_animation_play"
  | "icon_model_animation_speed"
  | "tone"
  | "is_locked"
  | "achieved_at"
  | "created_at"
  | "visibility"
  | "dedicated_by_user_id"
  | "dedication_status"
>;

export type AchievementDbWritePayload = Pick<
  AchievementInsert,
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
  | "icon_model_animation_play"
  | "icon_model_animation_speed"
  | "tone"
  | "is_locked"
  | "achieved_at"
  | "visibility"
>;
