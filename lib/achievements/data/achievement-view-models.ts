import type { LucideIcon } from "lucide-react";

import {
  type AchievementTone,
  getSafeTone,
} from "@/components/achievements/achievement-manager-utils";
import {
  type AchievementIconKey,
  type IconAssetKind,
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
import {
  parseBadgeModelAsset,
  type BadgeModelAsset,
} from "@/lib/achievements/badge/shared/badge-model-asset";
import { toOptimizedRenderUrl } from "@/lib/imagekit/render-src";
import {
  showsDedicatedBadgeAura,
  showsDedicatedBadgeEffect,
} from "@/lib/achievements/dedication/dedication-utils";
import type { AchievementDomainRow } from "@/lib/achievements/data/achievement-transformers";
import type { AchievementDbWritePayload } from "@/lib/achievements/data/achievement-db-schema";
import type { CollectionAchievementSnapshotSource } from "@/lib/share-invites/invite-snapshot";
import { z } from "zod";

export type AchievementGridViewModel = {
  id: string;
  title: string | null;
  dateLabel: string | null;
  displaySrc: string | null;
  FallbackIcon: LucideIcon;
  tone: AchievementTone;
  isLocked: boolean;
  hasImpressions: boolean;
  /** Dedicated particle glitter (image badges only). */
  showDedicatedGlitter: boolean;
};

export type AchievementDetailViewModel = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: AchievementIconKey;
  /** Optimized render URL, or null when there is no badge image. */
  renderSrc: string | null;
  iconUrl: string | null;
  iconFileId: string | null;
  /** Set when the badge is an uploaded GLB; null for flat image badges. */
  model: BadgeModelAsset | null;
  tone: AchievementTone;
  FallbackIcon: LucideIcon;
  isLocked: boolean;
  achievedAt: string | null;
  createdAt: string;
  visibility: AchievementVisibility;
  impressionCount: number;
  hasCustomBadge: boolean;
  showDedicatedGlitter: boolean;
  dedicatedByUserId: string | null;
  dedicationStatus: "pending" | "accepted" | null;
};

export type AchievementCollectionEntryViewModel = {
  grid: AchievementGridViewModel;
  detail: AchievementDetailViewModel;
};

const detailViewModelSchema = z.custom<AchievementDetailViewModel>();

const detailToFormSchema = detailViewModelSchema.transform<FormState>((detail) => ({
  title: detail.title ?? "",
  description: detail.description ?? "",
  category: detail.category ?? "",
  icon: detail.icon,
  iconUrl: detail.iconUrl ?? "",
  iconFileId: detail.iconFileId ?? "",
  iconAssetKind: detail.model ? "model_glb" : "image",
  iconAssetPath: detail.model?.assetPath ?? "",
  iconCcAttribution: detail.model?.ccAttribution ?? "",
  iconModelYaw: detail.model?.yaw ?? 0,
  iconModelPitch: detail.model?.pitch ?? 0,
  iconModelAnimationPlay: detail.model?.animationPlay ?? true,
  iconModelAnimationSpeed: detail.model?.animationSpeed ?? 1,
  tone: getSafeTone(detail.tone),
  isLocked: detail.isLocked,
  achievedAt: detail.achievedAt ?? "",
  visibility: detail.visibility,
}));

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

function createdAtMs(detail: AchievementDetailViewModel): number {
  return new Date(detail.createdAt).getTime();
}

function achievedAtMs(detail: AchievementDetailViewModel): number {
  if (!detail.achievedAt) return 0;
  return new Date(`${detail.achievedAt}T00:00:00`).getTime();
}

/** 0 = locked undated, 1 = unlocked undated, 2 = has achievedAt */
function detailSortKey(detail: AchievementDetailViewModel): [number, number, number] {
  const dated = Boolean(detail.achievedAt);
  if (!dated && detail.isLocked) return [0, 0, -createdAtMs(detail)];
  if (!dated && !detail.isLocked) return [1, 0, -createdAtMs(detail)];
  return [2, -achievedAtMs(detail), -createdAtMs(detail)];
}

export function sortDetailViewModels(details: AchievementDetailViewModel[]): AchievementDetailViewModel[] {
  return [...details].sort((a, b) => {
    const ak = detailSortKey(a);
    const bk = detailSortKey(b);
    for (let i = 0; i < ak.length; i++) {
      if (ak[i] !== bk[i]) return ak[i] - bk[i];
    }
    return 0;
  });
}

export function sortCollectionEntries(
  entries: AchievementCollectionEntryViewModel[],
): AchievementCollectionEntryViewModel[] {
  return [...entries].sort((a, b) => {
    const ak = detailSortKey(a.detail);
    const bk = detailSortKey(b.detail);
    for (let i = 0; i < ak.length; i++) {
      if (ak[i] !== bk[i]) return ak[i] - bk[i];
    }
    return 0;
  });
}

export function domainRowToDetailViewModel(row: AchievementDomainRow): AchievementDetailViewModel {
  const iconUrl = row.icon_url;
  const model = parseBadgeModelAsset({
    iconAssetKind: row.icon_asset_kind,
    iconAssetPath: row.icon_asset_path,
    iconModelYaw: row.icon_model_yaw,
    iconModelPitch: row.icon_model_pitch,
    iconModelAnimationPlay: row.icon_model_animation_play,
    iconModelAnimationSpeed: row.icon_model_animation_speed,
    iconCcAttribution: row.icon_cc_attribution,
  });
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    icon: row.icon,
    renderSrc: toOptimizedRenderUrl(iconUrl),
    iconUrl,
    iconFileId: row.icon_file_id,
    model,
    tone: row.tone,
    FallbackIcon: getSafeIcon(row.icon),
    isLocked: row.is_locked,
    achievedAt: row.achieved_at,
    createdAt: row.created_at,
    visibility: row.visibility,
    impressionCount: row.impression_count,
    hasCustomBadge: iconUrl !== null,
    showDedicatedGlitter: showsDedicatedBadgeEffect({
      dedicatedByUserId: row.dedicated_by_user_id,
      dedicationStatus: row.dedication_status,
      model,
    }),
    dedicatedByUserId: row.dedicated_by_user_id,
    dedicationStatus: row.dedication_status,
  };
}

export function detailToGridViewModel(detail: AchievementDetailViewModel): AchievementGridViewModel {
  return {
    id: detail.id,
    title: detail.title,
    dateLabel: formatGridDate(detail.achievedAt),
    displaySrc: detail.renderSrc,
    FallbackIcon: detail.FallbackIcon,
    tone: detail.tone,
    isLocked: detail.isLocked,
    hasImpressions: detail.impressionCount > 0,
    showDedicatedGlitter: detail.showDedicatedGlitter,
  };
}

export function collectionEntryFromDetail(
  detail: AchievementDetailViewModel,
): AchievementCollectionEntryViewModel {
  return {
    detail,
    grid: detailToGridViewModel(detail),
  };
}

export function domainRowToCollectionEntry(row: AchievementDomainRow): AchievementCollectionEntryViewModel {
  return collectionEntryFromDetail(domainRowToDetailViewModel(row));
}

export function domainRowsToCollectionEntries(
  rows: AchievementDomainRow[],
): AchievementCollectionEntryViewModel[] {
  return rows.map(domainRowToCollectionEntry);
}

export function updateCollectionEntryDetail(
  entries: AchievementCollectionEntryViewModel[],
  detail: AchievementDetailViewModel,
): AchievementCollectionEntryViewModel[] {
  return entries.map((entry) =>
    entry.detail.id === detail.id ? collectionEntryFromDetail(detail) : entry,
  );
}

export function mapCollectionDetails(
  entries: AchievementCollectionEntryViewModel[],
  mapDetail: (detail: AchievementDetailViewModel) => AchievementDetailViewModel,
): AchievementCollectionEntryViewModel[] {
  return entries.map((entry) => collectionEntryFromDetail(mapDetail(entry.detail)));
}

export function upsertCollectionEntry(
  entries: AchievementCollectionEntryViewModel[],
  detail: AchievementDetailViewModel,
): AchievementCollectionEntryViewModel[] {
  const rest = entries.filter((entry) => entry.detail.id !== detail.id);
  return sortCollectionEntries([collectionEntryFromDetail(detail), ...rest]);
}

export function detailToShareInviteSnapshotSource(
  detail: AchievementDetailViewModel,
): CollectionAchievementSnapshotSource {
  return {
    title: detail.title,
    description: detail.description,
    category: detail.category,
    icon: detail.icon,
    icon_url: detail.iconUrl ?? "",
    icon_file_id: detail.iconFileId,
    icon_asset_kind: detail.model ? "model_glb" : "image",
    icon_asset_path: detail.model?.assetPath ?? null,
    icon_cc_attribution: detail.model?.ccAttribution ?? null,
    icon_model_yaw: detail.model?.yaw ?? 0,
    icon_model_pitch: detail.model?.pitch ?? 0,
    tone: detail.tone,
    achieved_at: detail.achievedAt,
  };
}

export function achievementDetailToForm(detail: AchievementDetailViewModel): FormState {
  return detailToFormSchema.parse(detail);
}

export function formToPayload(form: FormState): AchievementDbWritePayload {
  return formToPayloadSchema.parse(form);
}

/** True when panel edit form differs from the saved achievement. */
export function isAchievementFormDirty(
  form: FormState,
  detail: AchievementDetailViewModel,
): boolean {
  const current = formToPayload(form);
  const baseline = formToPayload(achievementDetailToForm(detail));
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

/** @deprecated Use {@link achievementDetailToForm}. */
export const achievementToForm = achievementDetailToForm;

/** @deprecated Use {@link domainRowToDetailViewModel} + {@link detailToGridViewModel}. */
export function achievementToGridItem(row: AchievementDomainRow): AchievementGridViewModel {
  return detailToGridViewModel(domainRowToDetailViewModel(row));
}

export { showsDedicatedBadgeAura };
