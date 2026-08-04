import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { RlsScopedSupabaseClient } from "@/lib/supabase/clients/client-types";
import type { Database } from "@/lib/supabase/database.types";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export const PATHNAME_HEADER = "x-pathname";

export function createEdgeSupabase(request: NextRequest) {
  const box = { response: nextWithPathname(request) };
  const { url, publishableKey } = getPublicSupabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        box.response = nextWithPathname(request);
        cookiesToSet.forEach(({ name, value, options }) => {
          box.response.cookies.set(name, value, options);
        });
      },
    },
  }) as RlsScopedSupabaseClient;

  return { supabase, box };
}

function nextWithPathname(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
