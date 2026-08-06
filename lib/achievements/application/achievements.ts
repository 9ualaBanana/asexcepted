import type { Result } from "neverthrow";

import { createAchievementPort } from "@/lib/achievements/application/adapters";
import type { AchievementPort } from "@/lib/achievements/application/ports";
import type { AchievementWrite } from "@/lib/achievements/domain/achievement";
import {
  achievementToDetailViewModel,
  achievementsToCollectionEntries,
  sortCollectionEntries,
  type AchievementCollectionEntryViewModel,
  type AchievementDetailViewModel,
} from "@/lib/achievements/presentation/collection-view-models";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";

export type AchievementListResult = Result<
  AchievementCollectionEntryViewModel[],
  string
>;
export type AchievementSingleResult = Result<AchievementDetailViewModel, string>;
export type AchievementDeleteResult = Result<void, string>;

function defaultAchievementPort(): AchievementPort {
  return createAchievementPort(createBrowserSupabase());
}

export async function listAchievements(
  userId: string,
  port: AchievementPort = defaultAchievementPort(),
): Promise<AchievementListResult> {
  const result = await port.list(userId);
  return result.map((rows) =>
    sortCollectionEntries(achievementsToCollectionEntries(rows)),
  );
}

export async function createAchievement(
  write: AchievementWrite,
  port: AchievementPort = defaultAchievementPort(),
): Promise<AchievementSingleResult> {
  const result = await port.create(write);
  return result.map(achievementToDetailViewModel);
}

export async function updateAchievement(
  id: string,
  write: AchievementWrite,
  port: AchievementPort = defaultAchievementPort(),
): Promise<AchievementSingleResult> {
  const result = await port.update(id, write);
  return result.map(achievementToDetailViewModel);
}

export async function deleteAchievement(
  id: string,
  port: AchievementPort = defaultAchievementPort(),
): Promise<AchievementDeleteResult> {
  return port.delete(id);
}

export async function unlockAchievement(
  id: string,
  port: AchievementPort = defaultAchievementPort(),
): Promise<AchievementSingleResult> {
  const result = await port.unlock(id);
  return result.map(achievementToDetailViewModel);
}
