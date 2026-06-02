import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import { isPublicHttpImageUrl } from "@/lib/achievements/badge/shared/badge-assets";
import { isModelGlbAsset } from "@/lib/achievements/badge/shared/badge-model-asset";
import { resolveClaimedBadgeIconFields } from "@/lib/achievements/badge/shared/badge-assets-server";
import {
  insertDedicatedAchievement,
  type DedicatedAchievementRow,
} from "@/lib/achievements/data/dedication-db";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Client = SupabaseClient<Database>;
type AchievementInsert = Database["public"]["Tables"]["achievements"]["Insert"];

export const dedicateAchievementBodySchema = z.object({
  recipientUserId: z.uuid(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  icon: z.string().optional(),
  icon_url: z.string().nullable().optional(),
  icon_file_id: z.string().nullable().optional(),
  icon_asset_kind: z.enum(["image", "model_glb"]).optional(),
  icon_asset_path: z.string().nullable().optional(),
  icon_cc_attribution: z.string().nullable().optional(),
  icon_model_yaw: z.number().optional(),
  icon_model_pitch: z.number().optional(),
  icon_model_animation_play: z.boolean().optional(),
  icon_model_animation_speed: z.number().optional(),
  tone: z.string().optional(),
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

function validationFailure(message: string): DedicateAchievementFailure {
  return { message, status: 400 };
}

function serverFailure(message: string): DedicateAchievementFailure {
  return { message, status: 500 };
}

function validateDedicateBadge(body: DedicateAchievementBody): Result<void, DedicateAchievementFailure> {
  if (isModelGlbAsset({ iconAssetKind: body.icon_asset_kind, iconAssetPath: body.icon_asset_path })) {
    if (!isPublicHttpImageUrl(body.icon_url)) {
      return err(validationFailure("The 3D badge preview must be saved before dedicating."));
    }
  } else if (!isPublicHttpImageUrl(body.icon_url)) {
    return err(validationFailure("Badge image must finish uploading before dedicating."));
  }
  return ok(undefined);
}

function dedicateBodyToAchievementInsert(
  body: DedicateAchievementBody,
  dedicatorUserId: string,
  badge: { iconUrl: string; iconAssetPath: string | null },
): AchievementInsert {
  const iconAssetKind = body.icon_asset_kind ?? "image";
  return {
    user_id: body.recipientUserId,
    title: body.title ?? null,
    description: body.description ?? null,
    category: body.category ?? null,
    icon: body.icon ?? "trophy",
    icon_url: badge.iconUrl,
    icon_file_id: body.icon_file_id ?? null,
    icon_asset_kind: iconAssetKind,
    icon_asset_path: badge.iconAssetPath,
    icon_cc_attribution: body.icon_cc_attribution ?? null,
    icon_model_yaw: body.icon_model_yaw ?? 0,
    icon_model_pitch: body.icon_model_pitch ?? 0,
    icon_model_animation_play: body.icon_model_animation_play ?? true,
    icon_model_animation_speed: Math.min(
      2,
      Math.max(0.1, body.icon_model_animation_speed ?? 1),
    ),
    tone: body.tone ?? "teal",
    is_locked: true,
    achieved_at: body.achieved_at ?? null,
    visibility: "public",
    dedicated_by_user_id: dedicatorUserId,
    dedication_status: "pending",
  };
}

async function resolveDedicatedBadge(
  body: DedicateAchievementBody,
  dedicatorUserId: string,
): Promise<Result<{ iconUrl: string; iconAssetPath: string | null }, DedicateAchievementFailure>> {
  const iconAssetKind = body.icon_asset_kind ?? "image";
  try {
    const resolved = await resolveClaimedBadgeIconFields({
      senderUserId: dedicatorUserId,
      claimerUserId: body.recipientUserId,
      iconUrl: body.icon_url ?? null,
      iconAssetKind,
      iconAssetPath: body.icon_asset_path ?? null,
    });
    return ok({
      iconUrl: resolved.iconUrl,
      iconAssetPath: resolved.iconAssetPath,
    });
  } catch (cloneError) {
    return err(
      serverFailure(
        cloneError instanceof Error
          ? cloneError.message
          : "Could not copy the 3D badge for this dedication.",
      ),
    );
  }
}

export async function createDedicatedAchievement(args: {
  body: DedicateAchievementBody;
  dedicatorUserId: string;
  supabase?: Client;
}): Promise<Result<DedicatedAchievementRow, DedicateAchievementFailure>> {
  const badgeValidation = validateDedicateBadge(args.body);
  if (badgeValidation.isErr()) {
    return err(badgeValidation.error);
  }

  const badgeResult = await resolveDedicatedBadge(args.body, args.dedicatorUserId);
  if (badgeResult.isErr()) {
    return err(badgeResult.error);
  }

  const supabase = args.supabase ?? createServiceRoleClient();
  const insertResult = await insertDedicatedAchievement(
    supabase,
    dedicateBodyToAchievementInsert(args.body, args.dedicatorUserId, badgeResult.value),
  );
  if (insertResult.isErr()) {
    return err(serverFailure(insertResult.error));
  }
  return ok(insertResult.value);
}
