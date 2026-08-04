import { type NextRequest, NextResponse } from "next/server";

import { allowRateLimit } from "@/lib/embed/embed-rate-limit";

const EMBED_BADGE_PREFIX = "/embed/badge/";

/**
 * Rate-limit + iframe CSP for badge embed views. Auth-independent.
 */
export function applyEmbedBadgeEdgePolicy(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith(EMBED_BADGE_PREFIX)) {
    return response;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!allowRateLimit(`embed-view:${ip}`, 180, 60_000)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  response.headers.set("Content-Security-Policy", "frame-ancestors *");
  return response;
}
