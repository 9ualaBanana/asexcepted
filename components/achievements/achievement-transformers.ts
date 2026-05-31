import { z } from "zod";
import { err, ok, type Result } from "neverthrow";
import type { LucideIcon } from "lucide-react";

import {
  type AchievementTone,
  getSafeTone,
} from "@/components/achievements/achievement-card";
import {
  type AchievementIconKey,
  type AchievementIconAssetKind,
  type AchievementVisibility,
  type FormState,
  formatGridDate,
  getSafeIcon,
  getSafeIconAssetKind,
  getSafeIconKey,
  getSafeVisibility,
  toNullable,
} from "@/components/achievements/achievement-editor-shared";
import { normalizeImageKitFileId } from "@/components/achievements/badge";
import { showsDedicatedBadgeEffect } from "@/lib/achievements/dedication-utils";
import type {
  AchievementDbRow,
  AchievementDbWritePayload,
} from "@/components/achievements/achievement-db-schema";

export type AchievementRecord = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: AchievementIconKey;
  icon_url: string | null;
  icon_file_id: string | null;
  icon_asset_kind: AchievementIconAssetKind;
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

/** True when the row has uploaded badge art (not the default Lucide fallback). */
export function achievementHasCustomBadge(
  achievement: Pick<AchievementRecord, "icon_url">,
): boolean {
  return Boolean(achievement.icon_url?.trim());
}

export type AchievementGridViewModel = {
  id: string;
  title: string | null;
  dateLabel: string | null;
  iconUrl: string;
  FallbackIcon: LucideIcon;
  tone: AchievementTone;
  isLocked: boolean;
  hasImpressions: boolean;
  /** Dedicated particle glitter (image badges only). */
  showDedicatedGlitter: boolean;
};

const achievementDbRowSchema = z.custom<AchievementDbRow>();

const normalizeAchievementSchema = achievementDbRowSchema.transform<AchievementRecord>(
  (record) => ({
    id: String(record.id),
    title: record.title,
    description: record.description,
    category: record.category,
    icon: getSafeIconKey(record.icon),
    icon_url: record.icon_url,
    icon_file_id: normalizeImageKitFileId(record.icon_file_id) || null,
    icon_asset_kind: getSafeIconAssetKind(record.icon_asset_kind),
    icon_asset_path: record.icon_asset_path?.trim() || null,
    icon_cc_attribution: record.icon_cc_attribution?.trim() || null,
    icon_model_yaw: Number(record.icon_model_yaw) || 0,
    icon_model_pitch: Number(record.icon_model_pitch) || 0,
    icon_model_animation_play:
      record.icon_model_animation_play === false ? false : true,
    icon_model_animation_speed:
      typeof record.icon_model_animation_speed === "number"
        ? Math.min(2, Math.max(0.1, record.icon_model_animation_speed))
        : 1,
    tone: getSafeTone(record.tone),
    is_locked: Boolean(record.is_locked),
    achieved_at: record.achieved_at,
    created_at: record.created_at,
    visibility: getSafeVisibility(record.visibility),
    impression_count: 0,
    dedicated_by_user_id: record.dedicated_by_user_id ?? null,
    dedication_status:
      record.dedication_status === "pending"
        ? "pending"
        : record.dedication_status === "accepted" || record.dedicated_by_user_id
          ? "accepted"
          : null,
  }),
);

const achievementRecordSchema = z.custom<AchievementRecord>();

const achievementToFormSchema = achievementRecordSchema.transform<FormState>((record) => ({
  title: record.title ?? "",
  description: record.description ?? "",
  category: record.category ?? "",
  icon: getSafeIconKey(record.icon),
  iconUrl: record.icon_url ?? "",
  iconFileId: record.icon_file_id ?? "",
  iconAssetKind: getSafeIconAssetKind(record.icon_asset_kind),
  iconAssetPath: record.icon_asset_path ?? "",
  iconCcAttribution: record.icon_cc_attribution ?? "",
  iconModelYaw: record.icon_model_yaw ?? 0,
  iconModelPitch: record.icon_model_pitch ?? 0,
  iconModelAnimationPlay: record.icon_model_animation_play !== false,
  iconModelAnimationSpeed: Number(record.icon_model_animation_speed) || 1,
  tone: getSafeTone(record.tone),
  isLocked: Boolean(record.is_locked),
  achievedAt: record.achieved_at ?? "",
  visibility: record.visibility,
}));

const achievementToGridItemSchema = achievementRecordSchema.transform<AchievementGridViewModel>(
  (record) => ({
    id: record.id,
    title: record.title,
    dateLabel: formatGridDate(record.achieved_at),
    iconUrl: record.icon_url?.trim() ?? "",
    FallbackIcon: getSafeIcon(record.icon),
    tone: getSafeTone(record.tone),
    isLocked: record.is_locked,
    hasImpressions: record.impression_count > 0,
    showDedicatedGlitter: showsDedicatedBadgeEffect(record),
  }),
);

const formStateSchema = z.custom<FormState>();

const formToPayloadSchema = formStateSchema.transform<AchievementDbWritePayload>((form) => ({
  title: toNullable(form.title),
  description: toNullable(form.description),
  category: toNullable(form.category),
  icon: form.icon,
  icon_url: toNullable(form.iconUrl),
  icon_file_id: normalizeImageKitFileId(form.iconFileId) || null,
  icon_asset_kind: form.iconAssetKind,
  icon_asset_path: toNullable(form.iconAssetPath),
  icon_cc_attribution: toNullable(form.iconCcAttribution),
  icon_model_yaw: form.iconModelYaw,
  icon_model_pitch: form.iconModelPitch,
  icon_model_animation_play: form.iconModelAnimationPlay,
  icon_model_animation_speed: Math.min(2, Math.max(0.1, form.iconModelAnimationSpeed)),
  tone: form.tone,
  is_locked: form.isLocked,
  achieved_at: toNullable(form.achievedAt),
  visibility: form.visibility,
}));

/** Maps a DB row without Zod (avoids false failures on dedicated / 3D badge rows). */
export function coerceAchievementDbRow(row: Record<string, unknown>): AchievementRecord {
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
    icon: getSafeIconKey(row.icon as string | null | undefined),
    icon_url: (row.icon_url as string | null) ?? null,
    icon_file_id: iconFileId,
    icon_asset_kind: getSafeIconAssetKind(row.icon_asset_kind as string | null | undefined),
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
    tone: getSafeTone(row.tone as string | null | undefined),
    is_locked: Boolean(row.is_locked),
    achieved_at: (row.achieved_at as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    visibility: getSafeVisibility(row.visibility as string | null | undefined),
    impression_count: 0,
    dedicated_by_user_id: (row.dedicated_by_user_id as string | null) ?? null,
    dedication_status: dedicationStatus,
  };
}

export function tryNormalizeAchievement(
  record: unknown,
): Result<AchievementRecord, string> {
  if (!record || typeof record !== "object") {
    return err("Invalid achievement row.");
  }
  try {
    return ok(coerceAchievementDbRow(record as Record<string, unknown>));
  } catch (error) {
    return err(error instanceof Error ? error.message : "Invalid achievement row.");
  }
}

export function normalizeAchievement(record: AchievementDbRow): AchievementRecord {
  const result = tryNormalizeAchievement(record);
  if (result.isErr()) {
    throw new Error(result.error);
  }
  return result.value;
}

export function achievementToForm(record: AchievementRecord): FormState {
  return achievementToFormSchema.parse(record);
}

export function formToPayload(form: FormState): AchievementDbWritePayload {
  return formToPayloadSchema.parse(form);
}

/** True when panel edit form differs from the saved achievement. */
export function isAchievementFormDirty(
  form: FormState,
  record: AchievementRecord,
): boolean {
  const current = formToPayload(form);
  const baseline = formToPayload(achievementToForm(record));
  return (
    current.title !== baseline.title ||
    current.description !== baseline.description ||
    current.category !== baseline.category ||
    current.icon !== baseline.icon ||
    current.icon_url !== baseline.icon_url ||
    current.icon_file_id !== baseline.icon_file_id ||
    current.icon_asset_kind !== baseline.icon_asset_kind ||
    current.icon_asset_path !== baseline.icon_asset_path ||
    current.icon_cc_attribution !== baseline.icon_cc_attribution ||
    current.icon_model_yaw !== baseline.icon_model_yaw ||
    current.icon_model_pitch !== baseline.icon_model_pitch ||
    current.icon_model_animation_play !== baseline.icon_model_animation_play ||
    current.icon_model_animation_speed !== baseline.icon_model_animation_speed ||
    current.tone !== baseline.tone ||
    current.is_locked !== baseline.is_locked ||
    current.achieved_at !== baseline.achieved_at ||
    current.visibility !== baseline.visibility
  );
}

export function achievementToGridItem(record: AchievementRecord): AchievementGridViewModel {
  return achievementToGridItemSchema.parse(record);
}
