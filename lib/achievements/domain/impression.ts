import { err, ok, Result } from "neverthrow";
import { z } from "zod";

export const impressionSchema = z.object({
	id: z.uuid(),
	achievement_id: z.uuid(),
	owner_user_id: z.uuid(),
	actor_user_id: z.uuid(),
	created_at: z.string().min(1),
});
  
/** Trusted impression after boundary parse (read model). */
export type Impression = z.infer<typeof impressionSchema>;

export function parseImpression(
	record: unknown
): Result<Impression, string> {
	const parsed = impressionSchema.safeParse(record);
	if (!parsed.success) {
		return err("Invalid impression.");
	}
	return ok(parsed.data);
}

export const createImpressionResultSchema = z.object({
	added: z.boolean(),
	owner_user_id: z.uuid(),
	title: z.string()
});

export type CreateImpressionResult = z.infer<typeof createImpressionResultSchema>;

export function parseCreateImpressionResult(
	result: unknown
): Result<CreateImpressionResult, string> {
	const parsed = createImpressionResultSchema.safeParse(result);
	if (!parsed.success) {
		return err("Create impression result couldn't be parsed.");
	}
	return ok(parsed.data);
}

export const impressionCountMapSchema = z.object({
	achievement_id: z.uuid(),
	impression_count: z.number().nonnegative(),
});

export type ImpressionCountMap = z.infer<typeof impressionCountMapSchema>;

export function parseImpressionCount(
	record: unknown
): Result<ImpressionCountMap, string> {
	const parsed = impressionCountMapSchema.safeParse(record);
	if (!parsed.success) {
		return err("Invalid impression count.");
	}
	return ok(parsed.data);
}