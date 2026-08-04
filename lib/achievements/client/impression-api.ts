import { z } from "zod";

import { postJson } from "@/lib/client/fetch-json";
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
