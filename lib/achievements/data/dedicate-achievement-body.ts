import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import {
  DEFAULT_ACHIEVEMENT_ICON_KEY,
  DEFAULT_ACHIEVEMENT_TONE,
  DEFAULT_ICON_ASSET_KIND,
  achievementIconKeySchema,
  achievementToneSchema,
  iconAssetKindSchema,
} from "@/lib/achievements/data/achievement-enums";

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
