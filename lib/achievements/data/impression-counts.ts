import type { SupabaseClient } from "@supabase/supabase-js";

import type { AchievementRecord } from "@/lib/achievements/data/achievement-transformers";

type CountRow = {
  achievement_id: string;
  impression_count: number | string;
};

export async function fetchImpressionCountMap(
  supabase: SupabaseClient,
  achievementIds: string[],
): Promise<Record<string, number>> {
  if (achievementIds.length === 0) return {};

  const { data, error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("achievement_impression_counts", {
    p_achievement_ids: achievementIds,
  });

  if (error || !Array.isArray(data)) {
    return {};
  }

  const map: Record<string, number> = {};
  for (const row of data as CountRow[]) {
    const id = String(row.achievement_id);
    const count = Number(row.impression_count);
    if (id && Number.isFinite(count) && count > 0) {
      map[id] = count;
    }
  }
  return map;
}

export function attachImpressionCounts(
  records: AchievementRecord[],
  countMap: Record<string, number>,
): AchievementRecord[] {
  return records.map((record) => ({
    ...record,
    impression_count: countMap[record.id] ?? 0,
  }));
}
