import { err, ok, type Result } from "neverthrow";

import type { AchievementDbWritePayload } from "@/components/achievements/achievement-db-schema";

export type AchievementShareInviteIntent = "showcase" | "dedicate";

type CreateShareInviteBody =
  | {
      mode: "existing";
      achievementId: string;
      intent: AchievementShareInviteIntent;
    }
  | {
      mode: "draft";
      payload: AchievementDbWritePayload;
    };

export async function postCreateAchievementShareInvite(
  body: CreateShareInviteBody,
): Promise<Result<{ shareUrl: string }, string>> {
  const response = await fetch("/api/achievements/share-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        error?: string;
        shareUrl?: string;
      }
    | null;

  if (!response.ok) {
    return err(data?.error ?? "Could not create invite link.");
  }
  if (!data?.shareUrl) {
    return err("Invite link was not returned.");
  }

  return ok({ shareUrl: data.shareUrl });
}

export async function postClaimAchievementShareInvite(args: {
  token: string;
  autoAccept: boolean;
}): Promise<Result<{ achievementId: string; redirectPath: string }, string>> {
  const response = await fetch("/api/achievements/share-invite/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        error?: string;
        achievementId?: string;
        redirectPath?: string;
      }
    | null;

  if (!response.ok) {
    return err(data?.error ?? "Could not claim this invite.");
  }
  if (!data?.achievementId || !data.redirectPath) {
    return err("Invalid invite claim response.");
  }

  return ok({
    achievementId: data.achievementId,
    redirectPath: data.redirectPath,
  });
}

