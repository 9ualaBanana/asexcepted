import { DatabaseSupabaseClient } from "@/lib/supabase/clients/client-types";
import { err, ok, Result } from "neverthrow";
import { CreateImpressionResult, parseCreateImpressionResult, parseImpressionCount } from "@/lib/achievements/domain/impression";

export async function createImpression(
	supabase: DatabaseSupabaseClient,
	achievementId: string
): Promise<Result<CreateImpressionResult, string>> {
		const { data , error } = await supabase.rpc(
			"append_achievement_impression", {
				p_achievement_id: achievementId,
			})
			.single();

		if (error) {
			return err(error.message);
		}

		const parsed = parseCreateImpressionResult(data);
		if (parsed.isErr()) {
			return err(parsed.error);
		}
		return ok(parsed.value);
}

export async function fetchCountMap(
  supabase: DatabaseSupabaseClient,
  achievementIds: string[],
): Promise<Result<Record<string, number>, string>> {
  if (achievementIds.length === 0)
		return ok({});

  const { data, error } = await supabase.rpc(
		"achievement_impression_counts", {
    p_achievement_ids: achievementIds,
  });

  if (error || !Array.isArray(data)) {
    return err("Failed to fetch impression count map.");
  }

	return ok(data.map(parseImpressionCount)
		.filter(result => result.isOk())
		.map(result => result.value)
		.reduce((acc, count) => {
			acc[count.achievement_id] = count.impression_count;
			return acc;
		}, {} as Record<string, number>));
}