import { createBrowserClient } from "@supabase/ssr";

import type { RlsScopedSupabaseClient } from "@/lib/supabase/clients/client-types";
import type { Database } from "@/lib/supabase/database.types";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

/** Browser client (user session). RLS applies. */
export function createBrowserSupabase(): RlsScopedSupabaseClient {
  const { url, publishableKey } = getPublicSupabaseEnv();
  return createBrowserClient<Database>(
    url,
    publishableKey,
  ) as RlsScopedSupabaseClient;
}
