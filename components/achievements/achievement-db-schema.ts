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
  | "tone"
  | "is_locked"
  | "achieved_at"
  | "created_at"
>;

export type AchievementDbWritePayload = Pick<
  AchievementInsert,
  | "title"
  | "description"
  | "category"
  | "icon"
  | "icon_url"
  | "icon_file_id"
  | "tone"
  | "is_locked"
  | "achieved_at"
>;
