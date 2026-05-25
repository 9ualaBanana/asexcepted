import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { isAdmin } from "@/lib/admin";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

async function ProfilePageInner() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return redirect(loginWithNext(ROUTES.profile));
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center overflow-x-hidden pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex w-full flex-1 flex-col items-center gap-10">
        <nav className="flex h-14 w-full shrink-0 justify-center border-b border-b-foreground/10">
          <div className="flex w-full max-w-5xl items-center justify-center p-3 px-5 text-sm">
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </nav>

        <ProfilePageShell isAdmin={isAdmin(userData.user.id)} />
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}
