import { z } from "zod";
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
import { normalizeImageKitFileId } from "@/components/achievements/badge/badge-imagekit-session";
import { showsDedicatedBadgeAura } from "@/lib/achievements/dedication-utils";
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
  tone: AchievementTone;
  is_locked: boolean;
  achieved_at: string | null;
  created_at: string;
  visibility: AchievementVisibility;
  impression_count: number;
  dedicated_by_user_id: string | null;
  dedication_status: "pending" | "accepted" | null;
};

export type AchievementGridViewModel = {
  id: string;
  title: string | null;
  dateLabel: string | null;
  iconUrl: string;
  FallbackIcon: LucideIcon;
  tone: AchievementTone;
  isLocked: boolean;
  hasImpressions: boolean;
  isDedicated: boolean;
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
    isDedicated: showsDedicatedBadgeAura(record),
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
  tone: form.tone,
  is_locked: form.isLocked,
  achieved_at: toNullable(form.achievedAt),
  visibility: form.visibility,
}));

export function normalizeAchievement(record: AchievementDbRow): AchievementRecord {
  return normalizeAchievementSchema.parse(record);
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
    current.tone !== baseline.tone ||
    current.is_locked !== baseline.is_locked ||
    current.achieved_at !== baseline.achieved_at ||
    current.visibility !== baseline.visibility
  );
}

export function achievementToGridItem(record: AchievementRecord): AchievementGridViewModel {
  return achievementToGridItemSchema.parse(record);
}
