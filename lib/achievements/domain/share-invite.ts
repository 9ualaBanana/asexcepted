import { err, ok, type Result } from "neverthrow";
import { z, type ZodError } from "zod";

export const achievementSharePageKindSchema = z.enum([
  "invite",
  "showcase",
  "collaborate",
]);
export type AchievementSharePageKind = z.infer<typeof achievementSharePageKindSchema>;

export const achievementShareInviteStatusSchema = z.enum([
  "pending",
  "claiming",
  "claimed",
  "revoked",
  "expired",
]);

export type AchievementShareInviteStatus = z.infer<
  typeof achievementShareInviteStatusSchema
>;

export type AchievementShareInviteCreate = {
  id: string;
  sender_user_id: string;
  source_achievement_id: string | null;
  share_kind: string;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: string;
  icon_url: string;
  icon_file_id: string | null;
  icon_asset_kind: string;
  icon_asset_path: string | null;
  icon_cc_attribution: string | null;
  icon_model_yaw: number;
  icon_model_pitch: number;
  tone: string | null;
  achieved_at: string | null;
  token_hash: string;
  status: string;
};

export const achievementShareInviteCreateV2Schema = z.object({
  id: z.uuid(),
  sender_user_id: z.uuid(),
  source_achievement_id: z.uuid(),
  share_kind: achievementSharePageKindSchema,
  token_hash: z.string().min(1),
  status: achievementShareInviteStatusSchema,
});

/** Trusted share invite after boundary parse (v2 read model). */
export type AchievementShareInviteCreateV2 = z.infer<
  typeof achievementShareInviteCreateV2Schema
>;

function formatParseError(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid share invite.";
  const path = issue.path.length > 0 ? issue.path.join(".") : "root";
  return `Invalid share invite at ${path}: ${issue.message}`;
}

export function parseAchievementShareInviteCreateV2(
  record: unknown,
): Result<AchievementShareInviteCreateV2, string> {
  const parsed = achievementShareInviteCreateV2Schema.safeParse(record);
  if (!parsed.success) {
    return err(formatParseError(parsed.error));
  }
  return ok(parsed.data);
}
