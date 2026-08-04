import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type {
  RlsScopedSupabaseClient,
  ServiceRoleSupabaseClient,
} from "@/lib/supabase/clients/client-types";
import type { Database } from "@/lib/supabase/database.types";
import {
  getPublicSupabaseEnv,
  getServiceRoleSupabaseEnv,
} from "@/lib/supabase/env";

/**
 * Server client with cookie session. RLS applies.
 * Create a new client per request (do not cache globally).
 */
export async function createServerSupabase(): Promise<RlsScopedSupabaseClient> {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component — setAll can throw when cookies are read-only.
        }
      },
    },
  }) as RlsScopedSupabaseClient;
}

/**
 * Server client forced to anonymous role (no session cookies).
 * Public embed / unauthenticated RLS reads.
 */
export function createAnonSupabase(): RlsScopedSupabaseClient {
  const { url, publishableKey } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  }) as RlsScopedSupabaseClient;
}

/**
 * Service role. RLS bypassed — server only.
 * Prefer queries that filter by owner (or SECURITY DEFINER), not bare PK deletes.
 */
export function createServiceRoleSupabase(): ServiceRoleSupabaseClient {
  const { url, serviceRoleKey } = getServiceRoleSupabaseEnv();

  return createSupabaseJsClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as ServiceRoleSupabaseClient;
}
