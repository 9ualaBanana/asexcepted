import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

import { fetchFailureMessage, postJson } from "@/lib/client/fetch-json";

const embedTokenSuccessSchema = z.object({
  embedUrl: z.string().min(1),
});

export type MintEmbedBadgeTokenSuccessBody = z.infer<typeof embedTokenSuccessSchema>;

export async function requestEmbedBadgeToken(
  achievementId: string,
): Promise<Result<MintEmbedBadgeTokenSuccessBody, string>> {
  const result = await postJson(
    "/api/embed/badge-token",
    { achievementId },
    embedTokenSuccessSchema,
    "Missing embed URL.",
  );
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(result.value);
}
