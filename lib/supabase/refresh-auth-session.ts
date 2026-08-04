import { type NextRequest, type NextResponse } from "next/server";

import { createEdgeSupabase } from "@/lib/supabase/clients/edge";

export { PATHNAME_HEADER } from "@/lib/supabase/clients/edge";

export async function refreshAuthSession(
  request: NextRequest,
): Promise<NextResponse> {
  const { supabase, box } = createEdgeSupabase(request);
  // wrap response into mutable box to enable updating response w supabase.auth.getUser() call
  await supabase.auth.getUser();
  return box.response;
}
