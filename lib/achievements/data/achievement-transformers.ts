import { err, ok, type Result } from "neverthrow";

import {
  type AchievementIconKey,
  type AchievementTone,
  type AchievementVisibility,
  type IconAssetKind,
  parseIconAssetKind,
  parseIconKey,
  parseTone,
  parseVisibility,
} from "@/lib/achievements/data/achievement-enums";
import { normalizeBadgeIconUrl } from "@/lib/achievements/badge/shared/badge-assets";

/** Normalized DB row — map to view models before leaving the data layer. */
export type AchievementDomainRow = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: AchievementIconKey;
  icon_url: string | null;
  icon_file_id: string | null;
  icon_asset_kind: IconAssetKind;
  icon_asset_path: string | null;
  icon_cc_attribution: string | null;
  icon_model_yaw: number;
  icon_model_pitch: number;
  icon_model_animation_play: boolean;
  icon_model_animation_speed: number;
  tone: AchievementTone;
  is_locked: boolean;
  achieved_at: string | null;
  created_at: string;
  visibility: AchievementVisibility;
  impression_count: number;
  dedicated_by_user_id: string | null;
  dedication_status: "pending" | "accepted" | null;
};

/** Maps a DB row without Zod (avoids false failures on dedicated / 3D badge rows). */
export function coerceAchievementDbRow(row: Record<string, unknown>): AchievementDomainRow {
  const dedicationStatusRaw = row.dedication_status;
  const dedicationStatus =
    dedicationStatusRaw === "pending"
      ? "pending"
      : dedicationStatusRaw === "accepted" || row.dedicated_by_user_id
        ? "accepted"
        : null;

  const iconFileId =
    typeof row.icon_file_id === "string" ? row.icon_file_id.trim() || null : null;

  return {
    id: String(row.id ?? ""),
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    icon: parseIconKey(row.icon as string | null | undefined),
    icon_url: normalizeBadgeIconUrl(row.icon_url as string | null | undefined),
    icon_file_id: iconFileId,
    icon_asset_kind: parseIconAssetKind(row.icon_asset_kind as string | null | undefined),
    icon_asset_path:
      typeof row.icon_asset_path === "string" ? row.icon_asset_path.trim() || null : null,
    icon_cc_attribution:
      typeof row.icon_cc_attribution === "string"
        ? row.icon_cc_attribution.trim() || null
        : null,
    icon_model_yaw: Number(row.icon_model_yaw) || 0,
    icon_model_pitch: Number(row.icon_model_pitch) || 0,
    icon_model_animation_play:
      row.icon_model_animation_play === false ? false : true,
    icon_model_animation_speed:
      typeof row.icon_model_animation_speed === "number"
        ? Math.min(2, Math.max(0.1, row.icon_model_animation_speed))
        : 1,
    tone: parseTone(row.tone as string | null | undefined),
    is_locked: Boolean(row.is_locked),
    achieved_at: (row.achieved_at as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    visibility: parseVisibility(row.visibility as string | null | undefined),
    impression_count: 0,
    dedicated_by_user_id: (row.dedicated_by_user_id as string | null) ?? null,
    dedication_status: dedicationStatus,
  };
}

export function tryNormalizeAchievement(
  record: unknown,
): Result<AchievementDomainRow, string> {
  if (!record || typeof record !== "object") {
    return err("Invalid achievement row.");
  }
  try {
    return ok(coerceAchievementDbRow(record as Record<string, unknown>));
  } catch (error) {
    return err(error instanceof Error ? error.message : "Invalid achievement row.");
  }
}
