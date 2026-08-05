import {
  type FormState,
  toNullable,
} from "@/lib/achievements/data/achievement-form-state";
import {
  isModelGlbAsset,
  parseBadgeModelAsset,
  type BadgeModelAsset,
} from "@/lib/achievements/badge/shared/badge-model-asset";
import {
  ACHIEVEMENT_ICON_KEYS,
  ACHIEVEMENT_TONES,
  type AchievementIconKey,
  type AchievementTone,
  type AchievementVisibility,
} from "@/lib/achievements/data/achievement-enums";
import type { AchievementDbWritePayload } from "@/lib/achievements/data/achievement-db-schema";
import type { AchievementDomainRow } from "@/lib/achievements/data/achievement-transformers";
import {
  showsDedicatedBadgeAura,
  showsDedicatedBadgeEffect,
} from "@/lib/achievements/dedication/dedication-utils";
import { formatGridDate } from "@/lib/feed/format-feed-event-time";
import { normalizeImageKitFileId } from "@/lib/imagekit/client/imagekit-api";
import { toOptimizedRenderUrl } from "@/lib/imagekit/render-src";
import type { CollectionAchievementSnapshotSource } from "@/lib/share-invites/invite-snapshot";
import { z } from "zod";

const achievementIconKeySchema = z.enum(ACHIEVEMENT_ICON_KEYS);
const achievementToneSchema = z.enum(ACHIEVEMENT_TONES);
const achievementVisibilitySchema = z.enum(["public", "private"]);
const iconAssetKindSchema = z.enum(["image", "model_glb"]);

const badgeModelFormFieldsSchema = z.object({
  assetPath: z.string(),
  yaw: z.number(),
  pitch: z.number(),
  animationPlay: z.boolean(),
  animationSpeed: z.number(),
  ccAttribution: z.string().nullable(),
});

const detailToFormSchema = z
  .object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    icon: achievementIconKeySchema,
    iconUrl: z.string().nullable(),
    iconFileId: z.string().nullable(),
    model: badgeModelFormFieldsSchema.nullable(),
    tone: achievementToneSchema,
    isLocked: z.boolean(),
    achievedAt: z.string().nullable(),
    visibility: achievementVisibilitySchema,
  })
  .transform(
    (detail): FormState => ({
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
      tone: detail.tone,
      isLocked: detail.isLocked,
      achievedAt: detail.achievedAt ?? "",
      visibility: detail.visibility,
    }),
  );

const formToPayloadSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    icon: achievementIconKeySchema,
    iconUrl: z.string(),
    iconFileId: z.string(),
    iconAssetKind: iconAssetKindSchema,
    iconAssetPath: z.string(),
    iconCcAttribution: z.string(),
    iconModelYaw: z.number(),
    iconModelPitch: z.number(),
    iconModelAnimationPlay: z.boolean(),
    iconModelAnimationSpeed: z.number(),
    tone: achievementToneSchema,
    isLocked: z.boolean(),
    achievedAt: z.string(),
    visibility: achievementVisibilitySchema,
  })
  .transform(
    (form): AchievementDbWritePayload => ({
      title: toNullable(form.title),
      description: toNullable(form.description),
      category: toNullable(form.category),
      icon: form.icon,
      icon_url: toNullable(form.iconUrl),
      icon_file_id: normalizeImageKitFileId(form.iconFileId),
      icon_asset_kind: form.iconAssetKind,
      icon_asset_path: toNullable(form.iconAssetPath),
      icon_cc_attribution: toNullable(form.iconCcAttribution),
      icon_model_yaw: form.iconModelYaw,
      icon_model_pitch: form.iconModelPitch,
      icon_model_animation_play: form.iconModelAnimationPlay,
      icon_model_animation_speed: Math.min(
        2,
        Math.max(0.1, form.iconModelAnimationSpeed),
      ),
      tone: form.tone,
      is_locked: form.isLocked,
      achieved_at: toNullable(form.achievedAt),
      visibility: form.visibility,
    }),
  );

export type AchievementGridViewModel = {
  id: string;
  title: string | null;
  dateLabel: string | null;
  displaySrc: string | null;
  icon: AchievementIconKey;
  tone: AchievementTone;
  isLocked: boolean;
  hasImpressions: boolean;
  /** Dedicated particle effect (image badges only). */
  showDedicatedEffect: boolean;
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
  isLocked: boolean;
  achievedAt: string | null;
  createdAt: string;
  visibility: AchievementVisibility;
  impressionCount: number;
  hasCustomBadge: boolean;
  showDedicatedEffect: boolean;
  dedicatedByUserId: string | null;
  dedicationStatus: "pending" | "accepted" | null;
};

export type AchievementCollectionEntryViewModel = {
  grid: AchievementGridViewModel;
  detail: AchievementDetailViewModel;
};

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
    isLocked: row.is_locked,
    achievedAt: row.achieved_at,
    createdAt: row.created_at,
    visibility: row.visibility,
    impressionCount: row.impression_count,
    hasCustomBadge: iconUrl !== null,
    showDedicatedEffect: showsDedicatedBadgeEffect(
      showsDedicatedBadgeAura({
        dedicatedByUserId: row.dedicated_by_user_id,
        dedicationStatus: row.dedication_status,
      }),
      isModelGlbAsset(model),
    ),
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
    icon: detail.icon,
    tone: detail.tone,
    isLocked: detail.isLocked,
    hasImpressions: detail.impressionCount > 0,
    showDedicatedEffect: detail.showDedicatedEffect,
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

export { showsDedicatedBadgeAura };
