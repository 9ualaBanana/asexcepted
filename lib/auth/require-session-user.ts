import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createServerSupabase } from "@/lib/supabase/clients/server";
import type { RlsScopedSupabaseClient } from "@/lib/supabase/clients/client-types";
import { PATHNAME_HEADER } from "@/lib/supabase/clients/edge";
import { loginWithNext, ROUTES } from "@/lib/routes";

export type SessionUserContext = {
  supabase: RlsScopedSupabaseClient;
  user: User;
};

export const getSessionUser = cache(
  async (): Promise<{
    supabase: RlsScopedSupabaseClient;
    user: User | null;
  }> => {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { supabase, user };
  },
);

export async function requireSessionUser(): Promise<SessionUserContext> {
  const { supabase, user } = await getSessionUser();
  if (!user) {
    const headerStore = await headers();
    const pathname = headerStore.get(PATHNAME_HEADER) ?? ROUTES.inspa;
    redirect(loginWithNext(pathname));
  }
  return { supabase, user };
}

