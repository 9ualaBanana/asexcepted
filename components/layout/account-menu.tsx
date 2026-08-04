import Link from "next/link";

import { AccountMenuNav } from "@/components/layout/account-menu-nav";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { createServerSupabase } from "@/lib/supabase/clients/server";

export async function AccountMenu() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant="default">
          <Link href={ROUTES.login}>Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center pt-2">
      <AccountMenuNav label={headerLabelFromUser(user)} userId={user.id} />
    </div>
  );
}

function headerLabelFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const meta = user.user_metadata ?? {};
  const dn = meta.display_name ?? meta.full_name ?? meta.name;
  if (typeof dn === "string" && dn.trim()) return dn.trim();
  return user.email ?? "";
}
