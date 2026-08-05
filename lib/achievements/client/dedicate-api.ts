import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import type { AchievementDbWritePayload } from "@/lib/achievements/data/achievement-db-schema";
import {
  achievementIconKeySchema,
  achievementToneSchema,
  iconAssetKindSchema,
  type AchievementIconKey,
  type AchievementTone,
  type IconAssetKind,
} from "@/lib/achievements/data/achievement-enums";
import { fetchFailureMessage, postJson } from "@/lib/client/fetch-json";

export type DedicateAchievementApiBody = {
  recipientUserId: string;
  title: AchievementDbWritePayload["title"];
  description: AchievementDbWritePayload["description"];
  category: AchievementDbWritePayload["category"];
  icon: AchievementIconKey;
  icon_url: AchievementDbWritePayload["icon_url"];
  icon_file_id: AchievementDbWritePayload["icon_file_id"];
  icon_asset_kind: IconAssetKind;
  icon_asset_path: AchievementDbWritePayload["icon_asset_path"];
  icon_cc_attribution: AchievementDbWritePayload["icon_cc_attribution"];
  icon_model_yaw: number;
  icon_model_pitch: number;
  icon_model_animation_play: boolean;
  icon_model_animation_speed: number;
  tone: AchievementTone;
  achieved_at: AchievementDbWritePayload["achieved_at"];
};

const dedicateSuccessSchema = z.object({
  achievementId: z.uuid(),
});

export function payloadToDedicateApiBody(
  recipientUserId: string,
  payload: AchievementDbWritePayload,
): DedicateAchievementApiBody {
  return {
    recipientUserId,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    icon: achievementIconKeySchema.parse(payload.icon),
    icon_url: payload.icon_url,
    icon_file_id: payload.icon_file_id,
    icon_asset_kind: iconAssetKindSchema.parse(payload.icon_asset_kind),
    icon_asset_path: payload.icon_asset_path,
    icon_cc_attribution: payload.icon_cc_attribution,
    icon_model_yaw: z.number().parse(payload.icon_model_yaw),
    icon_model_pitch: z.number().parse(payload.icon_model_pitch),
    icon_model_animation_play: z.boolean().parse(payload.icon_model_animation_play),
    icon_model_animation_speed: z.number().min(0.1).max(2).parse(payload.icon_model_animation_speed),
    tone: achievementToneSchema.parse(payload.tone),
    achieved_at: payload.achieved_at,
  };
}

export async function postDedicateAchievement(
  body: DedicateAchievementApiBody,
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
