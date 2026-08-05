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
} from "@/lib/achievements/data/achievement-enums";
import { isSentryEnabled } from "@/lib/sentry/enabled";

export type AchievementDomainRow = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: AchievementIconKey;
  icon_url: string | null;
  icon_file_id: string | null;
  icon_asset_kind: IconAssetKind;
  icon_asset_path: string | null;
  icon_cc_attribution: string | null;
  icon_model_yaw: number;
  icon_model_pitch: number;
  icon_model_animation_play: boolean;
  icon_model_animation_speed: number;
  tone: AchievementTone;
  is_locked: boolean;
  achieved_at: string | null;
  created_at: string;
  visibility: AchievementVisibility;
  impression_count: number;
  dedicated_by_user_id: string | null;
  dedication_status: "pending" | "accepted" | null;
};

const nullableTextSchema = z.string().nullable();

const trimmedNullableTextSchema = z
  .string()
  .nullable()
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const achievementDomainRowObjectSchema = z.object({
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
  impression_count: z.number().int().nonnegative().optional(),
  dedicated_by_user_id: z.uuid().nullable(),
  dedication_status: z.enum(["pending", "accepted"]).nullable().optional(),
});

export const achievementDomainRowSchema = achievementDomainRowObjectSchema.transform(
  (row): AchievementDomainRow => {
    const dedication_status =
      row.dedication_status === "pending"
        ? "pending"
        : row.dedication_status === "accepted" || row.dedicated_by_user_id
          ? "accepted"
          : null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      icon: row.icon,
      icon_url: row.icon_url,
      icon_file_id: row.icon_file_id,
      icon_asset_kind: row.icon_asset_kind,
      icon_asset_path: row.icon_asset_path,
      icon_cc_attribution: row.icon_cc_attribution,
      icon_model_yaw: row.icon_model_yaw,
      icon_model_pitch: row.icon_model_pitch,
      icon_model_animation_play: row.icon_model_animation_play,
      icon_model_animation_speed: row.icon_model_animation_speed,
      tone: row.tone,
      is_locked: row.is_locked,
      achieved_at: row.achieved_at,
      created_at: row.created_at,
      visibility: row.visibility,
      impression_count: row.impression_count ?? 0,
      dedicated_by_user_id: row.dedicated_by_user_id,
      dedication_status,
    };
  },
);

function formatDomainRowError(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid achievement row.";
  const path = issue.path.length > 0 ? issue.path.join(".") : "root";
  return `Invalid achievement row at ${path}: ${issue.message}`;
}

export function reportInvalidAchievementDomainRow(args: {
  context: string;
  row: unknown;
  error: ZodError;
}): void {
  // if (!isSentryEnabled()) return;

  const rowId =
    args.row &&
    typeof args.row === "object" &&
    args.row !== null &&
    "id" in args.row
      ? String((args.row as { id: unknown }).id)
      : undefined;

  Sentry.captureException(
    new Error(`Invalid achievement domain row (${args.context})`),
    {
      tags: {
        area: "achievement_domain",
        context: args.context,
      },
      extra: {
        achievementId: rowId,
        issues: args.error.issues.slice(0, 12).map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      },
    },
  );
}

export function tryNormalizeAchievement(
  record: unknown,
): Result<AchievementDomainRow, string> {
  const parsed = achievementDomainRowSchema.safeParse(record);
  if (!parsed.success) {
    return err(formatDomainRowError(parsed.error));
  }
  return ok(parsed.data);
}

export function normalizeAchievementRowsForList(
  rows: unknown[],
  context: string,
): AchievementDomainRow[] {
  const domainRows: AchievementDomainRow[] = [];
  for (const row of rows) {
    const parsed = achievementDomainRowSchema.safeParse(row);
    if (!parsed.success) {
      reportInvalidAchievementDomainRow({
        context,
        row,
        error: parsed.error,
      });
      continue;
    }
    domainRows.push(parsed.data);
  }
  return domainRows;
}
