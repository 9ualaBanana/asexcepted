import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import { isPublicHttpImageUrl } from "@/lib/achievements/badge/shared/badge-assets";
import { isModelGlbAsset } from "@/lib/achievements/badge/shared/badge-model-asset";
import type {
  AchievementCreate,
  AchievementWrite,
} from "@/lib/achievements/domain/achievement";
import {
  DEFAULT_ACHIEVEMENT_ICON_KEY,
  DEFAULT_ACHIEVEMENT_TONE,
  DEFAULT_ICON_ASSET_KIND,
  achievementIconKeySchema,
  achievementToneSchema,
  iconAssetKindSchema,
} from "@/lib/achievements/domain/enums";
import { fetchFailureMessage, postJson } from "@/lib/client/fetch-json";

export const dedicateAchievementBodySchema = z.object({
  recipientUserId: z.uuid(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  icon: achievementIconKeySchema.default(DEFAULT_ACHIEVEMENT_ICON_KEY),
  icon_url: z.string().nullable().optional(),
  icon_file_id: z.string().nullable().optional(),
  icon_asset_kind: iconAssetKindSchema.default(DEFAULT_ICON_ASSET_KIND),
  icon_asset_path: z.string().nullable().optional(),
  icon_cc_attribution: z.string().nullable().optional(),
  icon_model_yaw: z.number().default(0),
  icon_model_pitch: z.number().default(0),
  icon_model_animation_play: z.boolean().default(true),
  icon_model_animation_speed: z.number().min(0.1).max(2).default(1),
  tone: achievementToneSchema.default(DEFAULT_ACHIEVEMENT_TONE),
  achieved_at: z.string().nullable().optional(),
});

export type DedicateAchievementBody = z.infer<typeof dedicateAchievementBodySchema>;

export type DedicateAchievementFailure = {
  message: string;
  status: 400 | 500;
};

export function parseDedicateAchievementBody(
  raw: unknown,
): Result<DedicateAchievementBody, DedicateAchievementFailure> {
  const parsed = dedicateAchievementBodySchema.safeParse(raw);
  if (!parsed.success) {
    return err({ message: "Invalid payload", status: 400 });
  }
  return ok(parsed.data);
}

export function validateDedicateBadge(
  body: DedicateAchievementBody,
): Result<void, DedicateAchievementFailure> {
  if (
    isModelGlbAsset({
      iconAssetKind: body.icon_asset_kind,
      iconAssetPath: body.icon_asset_path,
    })
  ) {
    if (!isPublicHttpImageUrl(body.icon_url)) {
      return err({
        message: "The 3D badge preview must be saved before dedicating.",
        status: 400,
      });
    }
  } else if (!isPublicHttpImageUrl(body.icon_url)) {
    return err({
      message: "Badge image must finish uploading before dedicating.",
      status: 400,
    });
  }
  return ok(undefined);
}

export function dedicateBodyToAchievementCreate(
  body: DedicateAchievementBody,
  dedicatorUserId: string,
  badge: { iconUrl: string; iconAssetPath: string | null },
): AchievementCreate {
  return {
    user_id: body.recipientUserId,
    title: body.title ?? null,
    description: body.description ?? null,
    category: body.category ?? null,
    icon: body.icon,
    icon_url: badge.iconUrl,
    icon_file_id: body.icon_file_id ?? null,
    icon_asset_kind: body.icon_asset_kind,
    icon_asset_path: badge.iconAssetPath,
    icon_cc_attribution: body.icon_cc_attribution ?? null,
    icon_model_yaw: body.icon_model_yaw,
    icon_model_pitch: body.icon_model_pitch,
    icon_model_animation_play: body.icon_model_animation_play,
    icon_model_animation_speed: body.icon_model_animation_speed,
    tone: body.tone,
    is_locked: true,
    achieved_at: body.achieved_at ?? null,
    visibility: "public",
    dedicated_by_user_id: dedicatorUserId,
    dedication_status: "pending",
  };
}

const dedicateSuccessSchema = z.object({
  achievementId: z.uuid(),
});

export function payloadToDedicateApiBody(
  recipientUserId: string,
  write: AchievementWrite,
): DedicateAchievementBody {
  return dedicateAchievementBodySchema.parse({
    recipientUserId,
    title: write.title,
    description: write.description,
    category: write.category,
    icon: write.icon,
    icon_url: write.icon_url,
    icon_file_id: write.icon_file_id,
    icon_asset_kind: write.icon_asset_kind,
    icon_asset_path: write.icon_asset_path,
    icon_cc_attribution: write.icon_cc_attribution,
    icon_model_yaw: write.icon_model_yaw,
    icon_model_pitch: write.icon_model_pitch,
    icon_model_animation_play: write.icon_model_animation_play,
    icon_model_animation_speed: write.icon_model_animation_speed,
    tone: write.tone,
    achieved_at: write.achieved_at,
  });
}

export async function postDedicateAchievement(
  body: DedicateAchievementBody,
): Promise<Result<{ achievementId: string }, string>> {
  const result = await postJson(
    "/api/achievements/dedicate",
    body,
    dedicateSuccessSchema,
    "Invalid dedication response.",
  );
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(result.value);
}
