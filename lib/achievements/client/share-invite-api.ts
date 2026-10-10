import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import { fetchFailureMessage, postJson } from "@/lib/client/fetch-json";

export type AchievementShareInviteIntent = "showcase" | "dedicate" | "collaborate";

type CreateShareInviteBody = {
  achievementId: string;
  intent: AchievementShareInviteIntent;
}

const shareInviteSuccessSchema = z.object({
  shareUrl: z.string().min(1),
});

const claimInviteSuccessSchema = z.object({
  achievementId: z.uuid(),
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

export async function postEndAchievementCollaboration(
  achievementId: string,
): Promise<Result<void, string>> {
  const result = await postJson(
    "/api/achievements/collaboration",
    { achievementId },
    z.object({ ok: z.literal(true) }),
    "Could not end this collaboration.",
  );
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(undefined);
}
