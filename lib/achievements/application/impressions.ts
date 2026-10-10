import type { Result } from "neverthrow";

import { createImpressionPort } from "@/lib/achievements/application/adapters";
import type { ImpressionPort } from "@/lib/achievements/application/ports";
import type { CreateImpressionResult } from "@/lib/achievements/domain/impression";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";

function defaultImpressionPort(): ImpressionPort {
  return createImpressionPort(createBrowserSupabase());
}

export async function createImpression(
  achievementId: string,
  port: ImpressionPort = defaultImpressionPort(),
): Promise<Result<CreateImpressionResult, string>> {
  return port.create(achievementId);
}

export async function loadImpressionCountMap(
  achievementIds: string[],
  port: ImpressionPort = defaultImpressionPort(),
): Promise<Result<Record<string, number>, string>> {
  return port.fetchCountMap(achievementIds);
}