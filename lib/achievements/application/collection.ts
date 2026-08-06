import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";

import {
  createAchievementPort,
  createImpressionPort,
} from "@/lib/achievements/application/adapters";
import type {
  AchievementPort,
  ImpressionPort,
} from "@/lib/achievements/application/ports";
import {
  achievementToDetailViewModel,
  collectionEntryFromDetail,
  sortCollectionEntries,
  type AchievementCollectionEntryViewModel,
} from "@/lib/achievements/presentation/collection-view-models";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";

export type ListCollectionPorts = {
  achievements: AchievementPort;
  impressions: ImpressionPort;
};

export type ListCollectionResult = Result<
  AchievementCollectionEntryViewModel[],
  string
>;

function defaultListCollectionPorts(): ListCollectionPorts {
  const supabase = createBrowserSupabase();
  return {
    achievements: createAchievementPort(supabase),
    impressions: createImpressionPort(supabase),
  };
}

export async function listCollection(
  userId: string,
  ports: ListCollectionPorts = defaultListCollectionPorts(),
): Promise<ListCollectionResult> {
  const listAchievementsResult = await ports.achievements.list(userId);
  if (listAchievementsResult.isErr()) {
    return err(listAchievementsResult.error);
  }
  const achievements = listAchievementsResult.value;

  const countImpressionsResult = await ports.impressions
    .fetchCountMap(achievements.map((a) => a.id));
  if (countImpressionsResult.isErr()) {
    return err(countImpressionsResult.error);
  }
  const impressionCounts = countImpressionsResult.value;

  const collectionEntries = achievements.map((achievement) =>
    collectionEntryFromDetail({
      ...achievementToDetailViewModel(achievement),
      impressionCount: impressionCounts[achievement.id] ?? 0,
    }),
  );

  return ok(sortCollectionEntries(collectionEntries));
}
