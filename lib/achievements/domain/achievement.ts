import * as Sentry from "@sentry/nextjs";
import { err, ok, type Result } from "neverthrow";
import { z, type ZodError } from "zod";

import { normalizeBadgeIconUrl } from "@/lib/achievements/badge/shared/badge-assets";
import {
  achievementIconKeySchema,
  achievementToneSchema,
  achievementVisibilitySchema,
  iconAssetKindSchema,
  type AchievementIconKey,
  type AchievementTone,
  type AchievementVisibility,
  type IconAssetKind,
} from "@/lib/achievements/domain/enums";

const nullableTextSchema = z.string().nullable();

const trimmedNullableTextSchema = z
  .string()
  .nullable()
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const achievementSchema = z.object({
  id: z.uuid(),
  title: nullableTextSchema,
  description: nullableTextSchema,
  category: nullableTextSchema,
  icon: achievementIconKeySchema,
  icon_url: z
    .string()
    .nullable()
    .transform((value) => normalizeBadgeIconUrl(value)),
  icon_file_id: trimmedNullableTextSchema,
  icon_asset_kind: iconAssetKindSchema,
  icon_asset_path: trimmedNullableTextSchema,
  icon_cc_attribution: trimmedNullableTextSchema,
  icon_model_yaw: z.number(),
  icon_model_pitch: z.number(),
  icon_model_animation_play: z.boolean(),
  icon_model_animation_speed: z.number().min(0.1).max(2),
  tone: achievementToneSchema,
  is_locked: z.boolean(),
  achieved_at: z.string().nullable(),
  created_at: z.string().min(1),
  visibility: achievementVisibilitySchema,
  dedicated_by_user_id: z.uuid().nullable(),
  dedication_status: z.enum(["pending", "accepted"]).nullable().default(null),
});

/** Trusted achievement after boundary parse (read model). */
export type Achievement = z.infer<typeof achievementSchema>;

/** Content fields written on create/update of an achievement. */
export type AchievementWrite = {
  title: string | null;
  description: string | null;
  category: string | null;
  icon: AchievementIconKey;
  icon_url: string | null;
  icon_file_id: string | null;
  icon_asset_kind: IconAssetKind;
  icon_asset_path: string | null;
  icon_cc_attribution: string | null;
  icon_model_yaw?: number;
  icon_model_pitch?: number;
  icon_model_animation_play?: boolean;
  icon_model_animation_speed?: number;
  tone: AchievementTone;
  is_locked: boolean;
  achieved_at: string | null;
  visibility?: AchievementVisibility;
};

/** Same content as {@link AchievementWrite}, plus owner / dedication for inserts. */
export type AchievementCreate = AchievementWrite & {
  user_id: string;
  dedicated_by_user_id?: string | null;
  dedication_status?: "pending" | "accepted" | null;
};

function formatParseError(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid achievement.";
  const path = issue.path.length > 0 ? issue.path.join(".") : "root";
  return `Invalid achievement at ${path}: ${issue.message}`;
}

export function parseAchievement(
  record: unknown,
): Result<Achievement, string> {
  const parsed = achievementSchema.safeParse(record);
  if (!parsed.success) {
    return err(formatParseError(parsed.error));
  }
  return ok(parsed.data);
}

/** Valid rows only; invalid ones are skipped and reported. */
export function parseAchievements(rows: unknown[]): Achievement[] {
  const out: Achievement[] = [];
  for (const row of rows) {
    const parsed = achievementSchema.safeParse(row);
    if (!parsed.success) {
      reportInvalidAchievement(row, parsed.error);
      continue;
    }
    out.push(parsed.data);
  }
  return out;
}

function reportInvalidAchievement(row: unknown, error: ZodError): void {
  const rowId =
    row && typeof row === "object" && row !== null && "id" in row
      ? String((row as { id: unknown }).id)
      : undefined;

  Sentry.captureException(new Error("Invalid achievement"), {
    tags: { area: "achievement_domain" },
    extra: {
      achievementId: rowId,
      issues: error.issues.slice(0, 12).map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    },
  });
}
