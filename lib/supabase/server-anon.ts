import { createServerClient } from "@supabase/ssr";

/**
 * Server Supabase client forced to anonymous role (no auth cookies read/write).
 * Use for public embed pages so the session cookie does not affect RLS.
 */
export function createAnonServerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );
}
