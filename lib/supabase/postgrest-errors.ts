import type { PostgrestError } from "@supabase/supabase-js";

/** PostgREST PGRST116 — `.single()` received 0 or 2+ rows. */
export function isPostgrestSingleRowCoercionError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST116") return true;
  return error.message.includes("Cannot coerce the result to a single JSON object");
}

export function formatSupabaseSingleRowError(
  error: PostgrestError,
  whenMissing: string,
  whenAmbiguous = "Unexpected duplicate rows were returned.",
): string {
  if (isPostgrestSingleRowCoercionError(error)) {
    const count = error.details?.match(/(\d+)\s+rows?/)?.[1];
    if (count === "0") return whenMissing;
    if (Number(count) > 1) return whenAmbiguous;
    return whenMissing;
  }
  return error.message;
}
