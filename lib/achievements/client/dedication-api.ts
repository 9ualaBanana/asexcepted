import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import { tryNormalizeAchievement } from "@/lib/achievements/data/achievement-transformers";
import {
  domainRowToDetailViewModel,
  type AchievementDetailViewModel,
} from "@/lib/achievements/data/achievement-view-models";
import { fetchFailureMessage, fetchJson } from "@/lib/client/fetch-json";

const acceptDedicationResponseSchema = z.object({
  achievement: z.record(z.string(), z.unknown()),
});

export type AcceptDedicationResult =
  | { kind: "accepted"; achievement: AchievementDetailViewModel }
  | { kind: "already_accepted" };

export async function postAcceptDedication(
  achievementId: string,
): Promise<Result<AcceptDedicationResult, string>> {
  const response = await fetchJson("/api/achievements/dedication/accept", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ achievementId }),
  });

  if (response.isErr()) {
    const failure = response.error;
    if (failure.status === 409) {
      return ok({ kind: "already_accepted" });
    }
    return err(fetchFailureMessage(failure));
  }

  const parsed = acceptDedicationResponseSchema.safeParse(response.value);
  if (!parsed.success) {
    return err("Could not read dedication after accepting.");
  }

  const normalized = tryNormalizeAchievement(parsed.data.achievement);
  if (normalized.isErr()) {
    return err(normalized.error);
  }

  return ok({
    kind: "accepted",
    achievement: domainRowToDetailViewModel(normalized.value),
  });
}
