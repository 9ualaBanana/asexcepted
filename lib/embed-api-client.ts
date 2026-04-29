import { err, ok, type Result } from "neverthrow";

import type {
  MintEmbedBadgeTokenErrorJson,
  MintEmbedBadgeTokenSuccessBody,
} from "@/lib/embed-api-types";

const BADGE_TOKEN_PATH = "/api/embed/badge-token";

function readErrorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as MintEmbedBadgeTokenErrorJson).error === "string" &&
    (data as MintEmbedBadgeTokenErrorJson).error.trim().length > 0
  ) {
    return (data as MintEmbedBadgeTokenErrorJson).error.trim();
  }
  return fallback;
}

function parseSuccessBody(data: unknown): Result<MintEmbedBadgeTokenSuccessBody, string> {
  if (
    typeof data === "object" &&
    data !== null &&
    "embedUrl" in data &&
    typeof (data as { embedUrl: unknown }).embedUrl === "string"
  ) {
    const embedUrl = (data as MintEmbedBadgeTokenSuccessBody).embedUrl.trim();
    if (embedUrl.length > 0) {
      return ok({ embedUrl });
    }
  }
  return err("Missing embed URL.");
}

/**
 * Mints an embed redirect token and returns the public embed URL.
 * HTTP stays JSON + status codes; this maps the response to a {@link Result}.
 */
export async function requestEmbedBadgeToken(
  achievementId: string,
): Promise<Result<MintEmbedBadgeTokenSuccessBody, string>> {
  let res: Response;
  try {
    res = await fetch(BADGE_TOKEN_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achievementId }),
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Network error.");
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return err("Invalid response from server.");
  }

  if (!res.ok) {
    return err(readErrorMessage(data, `Request failed (${res.status}).`));
  }

  return parseSuccessBody(data);
}
