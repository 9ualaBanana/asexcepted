import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { err, ok, type Result } from "neverthrow";

import { isPublicHttpImageUrl } from "@/lib/achievements/badge/shared/badge-assets";
import { isModelGlbAsset } from "@/lib/achievements/badge/shared/badge-model-asset";
import { resolveClaimedBadgeIconFields } from "@/lib/achievements/badge/shared/badge-assets-server";
import {
  insertDedicatedAchievement,
  type DedicatedAchievementRow,
} from "@/lib/achievements/data/dedication-db";
import {
  type DedicateAchievementBody,
  type DedicateAchievementFailure,
} from "@/lib/achievements/data/dedicate-achievement-body";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleSupabase } from "@/lib/supabase/clients/server";

export {
  dedicateAchievementBodySchema,
  parseDedicateAchievementBody,
  type DedicateAchievementBody,
  type DedicateAchievementFailure,
} from "@/lib/achievements/data/dedicate-achievement-body";

type Client = SupabaseClient<Database>;
type AchievementInsert = Database["public"]["Tables"]["achievements"]["Insert"];

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

async function resolveDedicatedBadge(
  body: DedicateAchievementBody,
  dedicatorUserId: string,
): Promise<Result<{ iconUrl: string; iconAssetPath: string | null }, DedicateAchievementFailure>> {
  try {
    const resolved = await resolveClaimedBadgeIconFields({
      senderUserId: dedicatorUserId,
      claimerUserId: body.recipientUserId,
      iconUrl: body.icon_url ?? null,
      iconAssetKind: body.icon_asset_kind,
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

  const supabase = args.supabase ?? createServiceRoleSupabase();
  const insertResult = await insertDedicatedAchievement(
    supabase,
    dedicateBodyToAchievementInsert(args.body, args.dedicatorUserId, badgeResult.value),
  );
  if (insertResult.isErr()) {
    return err(serverFailure(insertResult.error));
  }
  return ok(insertResult.value);
}
