import {
  createAchievement,
  deleteAchievement,
  listAchievements,
  unlockAchievement,
  updateAchievement,
  type AchievementDeleteResult,
  type AchievementListResult,
  type AchievementSingleResult,
} from "@/lib/achievements/persistence/achievements";
import type { SaveAchievementCommand } from "@/lib/achievements/domain/db-row";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";

export type {
  AchievementDeleteResult,
  AchievementListResult,
  AchievementSingleResult,
};

export async function listCollection(
  userId: string,
): Promise<AchievementListResult> {
  return listAchievements(createBrowserSupabase(), userId);
}

export async function createCollectionAchievement(
  command: SaveAchievementCommand,
): Promise<AchievementSingleResult> {
  return createAchievement(createBrowserSupabase(), command);
}

export async function updateCollectionAchievement(
  id: string,
  command: SaveAchievementCommand,
): Promise<AchievementSingleResult> {
  return updateAchievement(createBrowserSupabase(), id, command);
}

export async function deleteCollectionAchievement(
  id: string,
): Promise<AchievementDeleteResult> {
  return deleteAchievement(createBrowserSupabase(), id);
}

export async function unlockCollectionAchievement(
  id: string,
): Promise<AchievementSingleResult> {
  return unlockAchievement(createBrowserSupabase(), id);
}
