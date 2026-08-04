import { type NextRequest, type NextResponse } from "next/server";

import { applyEmbedBadgeEdgePolicy } from "@/lib/embed/apply-embed-badge-edge-policy";
import { createEdgeSupabase } from "@/lib/supabase/clients/edge";

export async function proxy(request: NextRequest) {
  const sessionResponse = await refreshAuthSession(request);
  return applyEmbedBadgeEdgePolicy(request, sessionResponse);
}

async function refreshAuthSession(
  request: NextRequest,
): Promise<NextResponse> {
  const { supabase, box } = createEdgeSupabase(request);
  // wrap response into mutable box to enable updating response w supabase.auth.getUser()
  await supabase.auth.getUser();
  return box.response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
