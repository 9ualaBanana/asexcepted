import { type NextRequest } from "next/server";

import { applyEmbedBadgeEdgePolicy } from "@/lib/embed/apply-embed-badge-edge-policy";
import { refreshAuthSession } from "@/lib/supabase/refresh-auth-session";

export async function proxy(request: NextRequest) {
  const sessionResponse = await refreshAuthSession(request);
  return applyEmbedBadgeEdgePolicy(request, sessionResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
