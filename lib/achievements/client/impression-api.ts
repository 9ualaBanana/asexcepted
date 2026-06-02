import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import { fetchFailureMessage, postJson } from "@/lib/client/fetch-json";
import { createClient } from "@/lib/supabase/client";

const impressionResponseSchema = z.object({
  ok: z.boolean().optional(),
  added: z.boolean().optional(),
});

export type ImpressionResult =
  | { ok: true; added: boolean }
  | { ok: false; added: false };

export async function postAchievementImpression(
  achievementId: string,
): Promise<ImpressionResult> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, added: false };
  }

  const result = await postJson(
    "/api/achievements/impression",
    { achievementId },
    impressionResponseSchema,
  );

  if (result.isErr()) {
    return { ok: false, added: false };
  }

  return { ok: true, added: Boolean(result.value.added) };
}

/** Same as {@link postAchievementImpression} but returns neverthrow for callers that need errors. */
export async function postAchievementImpressionResult(
  achievementId: string,
): Promise<Result<{ added: boolean }, string>> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return err("Not authenticated");
  }

  const result = await postJson(
    "/api/achievements/impression",
    { achievementId },
    impressionResponseSchema,
  );
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok({ added: Boolean(result.value.added) });
}
