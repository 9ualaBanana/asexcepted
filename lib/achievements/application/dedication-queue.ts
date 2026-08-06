import type { Result } from "neverthrow";

import { createDedicationPort } from "@/lib/achievements/application/adapters";
import type { DedicationPort } from "@/lib/achievements/application/ports";
import type { Achievement } from "@/lib/achievements/domain/achievement";
import {
  achievementToDetailViewModel,
  type AchievementDetailViewModel,
} from "@/lib/achievements/presentation/collection-view-models";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";

function defaultDedicationPort(): DedicationPort {
  return createDedicationPort(createBrowserSupabase());
}

export async function listPendingDedications(
  recipientUserId: string,
  port: DedicationPort = defaultDedicationPort(),
): Promise<Result<AchievementDetailViewModel[], string>> {
  const result = await port.listPending(recipientUserId);
  return result.map((rows) => rows.map(achievementToDetailViewModel));
}

export async function acceptPendingDedication(
  achievementId: string,
  recipientUserId: string,
  port: DedicationPort = defaultDedicationPort(),
): Promise<Result<Achievement, string>> {
  return port.accept(achievementId, recipientUserId);
}

export async function rejectPendingDedication(
  achievementId: string,
  port: DedicationPort = defaultDedicationPort(),
): Promise<Result<void, string>> {
  return port.reject(achievementId);
}
