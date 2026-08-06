import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import type { AchievementWrite } from "@/lib/achievements/domain/achievement";
import { fetchFailureMessage, postJson } from "@/lib/client/fetch-json";

export type AchievementShareInviteIntent = "showcase" | "dedicate";

type CreateShareInviteBody =
  | {
      mode: "existing";
      achievementId: string;
      intent: AchievementShareInviteIntent;
    }
  | {
      mode: "draft";
      payload: AchievementWrite;
    };

const shareInviteSuccessSchema = z.object({
  shareUrl: z.string().min(1),
});

const claimInviteSuccessSchema = z.object({
  achievementId: z.string().uuid(),
  redirectPath: z.string().min(1),
});

export async function postCreateAchievementShareInvite(
  body: CreateShareInviteBody,
): Promise<Result<{ shareUrl: string }, string>> {
  const result = await postJson(
    "/api/achievements/share-invite",
    body,
    shareInviteSuccessSchema,
    "Invite link was not returned.",
  );
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(result.value);
}

export async function postClaimAchievementShareInvite(args: {
  token: string;
  autoAccept: boolean;
}): Promise<Result<{ achievementId: string; redirectPath: string }, string>> {
  const result = await postJson(
    "/api/achievements/share-invite/claim",
    args,
    claimInviteSuccessSchema,
    "Invalid invite claim response.",
  );
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(result.value);
}
