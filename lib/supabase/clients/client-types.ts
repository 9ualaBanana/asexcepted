import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Supabase client principals (compile-time brands).
 *
 * Factories:
 * - {@link createBrowserSupabase}
 * - {@link createServerSupabase}
 * - {@link createAnonSupabase}
 * - {@link createServiceRoleSupabase}
 *
 * RlsScoped and ServiceRole are not assignable to each other without cast.
 */

declare const rlsScopedBrand: unique symbol;
declare const serviceRoleBrand: unique symbol;

/** Untagged typed client — prefer {@link RlsScopedSupabaseClient} or {@link ServiceRoleSupabaseClient}. */
export type DatabaseSupabaseClient = SupabaseClient<Database>;

/** JWT/cookie or anon publishable — RLS applies. */
export type RlsScopedSupabaseClient = DatabaseSupabaseClient & {
  readonly [rlsScopedBrand]: "rls";
};

/** Service role — RLS bypassed; authz must be in the query or RPC. */
export type ServiceRoleSupabaseClient = DatabaseSupabaseClient & {
  readonly [serviceRoleBrand]: "service-role";
};
