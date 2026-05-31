"use client";

import { createClient } from "@/lib/supabase/client";

export type ImpressionResult =
  | { ok: true; added: boolean }
  | { ok: false; added: false };

/** Fire-and-forget impression API; no UI state — celebrate optimistically in the view. */
export async function submitImpression(
  achievementId: string,
): Promise<ImpressionResult> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, added: false };
  }

  try {
    const response = await fetch("/api/achievements/impression", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ achievementId }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      added?: boolean;
      error?: string;
    };

    if (!response.ok) {
      return { ok: false, added: false };
    }

    return { ok: true, added: Boolean(payload.added) };
  } catch {
    return { ok: false, added: false };
  }
}
