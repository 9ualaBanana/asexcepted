import { err, ok, type Result } from "neverthrow";

import { todayDateString } from "@/lib/feed/format-feed-event-time";
import {
  parseAchievement,
  parseAchievements,
  type Achievement,
  type AchievementWrite,
} from "@/lib/achievements/domain/achievement";
import {
  normalizeNetworkFailureMessage,
  retryOnTransientNetworkError,
} from "@/lib/client/fetch-json";
import type {
  DatabaseSupabaseClient,
  RlsScopedSupabaseClient,
  ServiceRoleSupabaseClient,
} from "@/lib/supabase/clients/client-types";
import type { Database } from "@/lib/supabase/database.types";
import { formatSupabaseSingleRowError } from "@/lib/supabase/postgrest-errors";

const ACHIEVEMENT_FULL_SELECT =
  "id,title,description,category,icon,icon_url,icon_file_id,icon_asset_kind,icon_asset_path,icon_cc_attribution,icon_model_yaw,icon_model_pitch,icon_model_animation_play,icon_model_animation_speed,tone,is_locked,achieved_at,created_at,visibility,dedicated_by_user_id,dedication_status";

export type AchievementEmbedBadgeSource = {
  icon_url: string | null;
  icon_asset_kind?: string | null;
  icon_asset_path?: string | null;
  icon_model_yaw?: number | null;
  icon_model_pitch?: number | null;
  icon_model_animation_play?: boolean | null;
  icon_model_animation_speed?: number | null;
  icon_cc_attribution?: string | null;
};

export type AchievementEmbedMintSource = {
  id: string;
  icon_url: string | null;
};

export type AchievementListResult = Result<Achievement[], string>;
export type AchievementSingleResult = Result<Achievement, string>;
export type AchievementDeleteResult = Result<void, string>;

export type AchievementUnlockPushRow = {
  id: string;
  user_id: string;
  title: string | null;
  is_locked: boolean;
  visibility: Database["public"]["Tables"]["achievements"]["Row"]["visibility"];
};

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

function toSingleResult(row: unknown): AchievementSingleResult {
  const parsed = parseAchievement(row);
  if (parsed.isErr()) {
    return err("Invalid achievement data received from the server.");
  }
  return ok(parsed.value);
}

export async function listAchievements(
  supabase: DatabaseSupabaseClient,
  userId: string,
): Promise<AchievementListResult> {
  const { data, error } = await supabase
    .from("achievements")
    .select(ACHIEVEMENT_FULL_SELECT)
    .eq("user_id", userId)
    .or("dedication_status.is.null,dedication_status.eq.accepted")
    .order("achieved_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return err(error.message);
  }

  const rows = parseAchievements(data ?? []);
  return ok(rows);
}

export async function createAchievement(
  supabase: DatabaseSupabaseClient,
  write: AchievementWrite,
): Promise<AchievementSingleResult> {
  return retryOnTransientNetworkError(async () => {
    try {
      const { data, error } = await supabase
        .from("achievements")
        .insert(write)
        .select(ACHIEVEMENT_FULL_SELECT)
        .single();

      if (error) {
        return err(normalizeNetworkFailureMessage(error.message));
      }
      if (!data || typeof data === "string") {
        return err("Unexpected response while creating achievement.");
      }
      return toSingleResult(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Network error.";
      return err(normalizeNetworkFailureMessage(message));
    }
  });
}

export async function updateAchievement(
  supabase: DatabaseSupabaseClient,
  achievementId: string,
  write: AchievementWrite,
): Promise<AchievementSingleResult> {
  return retryOnTransientNetworkError(async () => {
    try {
      const { data, error } = await supabase
        .from("achievements")
        .update(write)
        .eq("id", achievementId)
        .select(ACHIEVEMENT_FULL_SELECT)
        .single();

      if (error) {
        return err(normalizeNetworkFailureMessage(error.message));
      }
      if (!data || typeof data === "string") {
        return err("Unexpected response while updating achievement.");
      }
      return toSingleResult(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Network error.";
      return err(normalizeNetworkFailureMessage(message));
    }
  });
}

/**
 * Delete under an RLS-scoped client (browser / cookie session / anon).
 * Authorization is enforced by the "Users can delete own achievements" policy —
 * not by this helper. Do not pass a service-role client.
 */
export async function deleteAchievement(
  supabase: RlsScopedSupabaseClient,
  achievementId: string,
): Promise<AchievementDeleteResult> {
  const { error } = await supabase
    .from("achievements")
    .delete()
    .eq("id", achievementId)
    .select();

  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}

/**
 * Service-role delete after RLS bypass: always constrain by collection owner.
 * Use only with {@link ServiceRoleSupabaseClient}. Prefer this over bare
 * delete-by-id when the principal is the service role.
 */
export async function deleteAchievementForOwner(
  supabase: ServiceRoleSupabaseClient,
  achievementId: string,
  ownerUserId: string,
): Promise<AchievementDeleteResult> {
  const { error } = await supabase
    .from("achievements")
    .delete()
    .eq("id", achievementId)
    .eq("user_id", ownerUserId);

  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}

export async function unlockAchievement(
  supabase: DatabaseSupabaseClient,
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
  const row = existing as { achieved_at?: string | null } | null;
  if (!row?.achieved_at) {
    patch.achieved_at = todayDateString();
  }

  const { data, error } = await supabase
    .from("achievements")
    .update(patch)
    .eq("id", achievementId)
    .select(ACHIEVEMENT_FULL_SELECT)
    .single();

  if (error) {
    return err(error.message);
  }
  if (!data || typeof data === "string") {
    return err("Unexpected response while unlocking achievement.");
  }
  return toSingleResult(data);
}

export async function getAchievementForUnlockPush(
  supabase: DatabaseSupabaseClient,
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

export async function getAchievementEmbedBadgeSource(
  supabase: DatabaseSupabaseClient,
  achievementId: string,
): Promise<Result<AchievementEmbedBadgeSource, string>> {
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
  return ok(data);
}

export async function getAchievementEmbedMintSource(
  supabase: DatabaseSupabaseClient,
  achievementId: string,
  ownerUserId: string,
): Promise<Result<AchievementEmbedMintSource, string>> {
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
  return ok(data);
}

export async function getAchievementDedicationNotifyRow(
  supabase: DatabaseSupabaseClient,
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
  supabase: DatabaseSupabaseClient,
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
  supabase: DatabaseSupabaseClient,
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

export async function getAchievementOwnerUserId(
  supabase: DatabaseSupabaseClient,
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
