import { z } from "zod";
import type { LucideIcon } from "lucide-react";

import {
  type AchievementTone,
  getSafeTone,
} from "@/components/achievements/achievement-card";
import {
  type AchievementIconKey,
  type FormState,
  formatGridDate,
  getSafeIcon,
  getSafeIconKey,
  toNullable,
} from "@/components/achievements/achievement-editor-shared";
import { normalizeImageKitFileId } from "@/components/achievements/badge/badge-imagekit-session";
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
  tone: AchievementTone;
  is_locked: boolean;
  achieved_at: string | null;
  created_at: string;
};

export type AchievementGridViewModel = {
  id: string;
  title: string | null;
  dateLabel: string | null;
  iconUrl: string;
  FallbackIcon: LucideIcon;
  tone: AchievementTone;
  isLocked: boolean;
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
    tone: getSafeTone(record.tone),
    is_locked: Boolean(record.is_locked),
    achieved_at: record.achieved_at,
    created_at: record.created_at,
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
  tone: getSafeTone(record.tone),
  isLocked: Boolean(record.is_locked),
  achievedAt: record.achieved_at ?? "",
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
  tone: form.tone,
  is_locked: form.isLocked,
  achieved_at: toNullable(form.achievedAt),
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

export function achievementToGridItem(record: AchievementRecord): AchievementGridViewModel {
  return achievementToGridItemSchema.parse(record);
}
