import {
  listPendingDedications,
  rejectDedication,
} from "@/lib/achievements/persistence/dedications";
import type { AchievementDetailViewModel } from "@/lib/achievements/presentation/collection-view-models";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";
import type { Result } from "neverthrow";

export async function listPendingCollectionDedications(
  recipientUserId: string,
): Promise<Result<AchievementDetailViewModel[], string>> {
  return listPendingDedications(createBrowserSupabase(), recipientUserId);
}

export async function rejectPendingDedication(
  achievementId: string,
): Promise<Result<void, string>> {
  return rejectDedication(createBrowserSupabase(), achievementId);
}
