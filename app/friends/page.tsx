import { redirect } from "next/navigation";
import { AuthButton } from "@/components/auth-button";
import { FriendsPanel } from "@/components/social/friends-panel";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function FriendsPageInner() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return redirect("/auth/login?next=/friends");
  }

  return (
    <main className="relative min-h-[100dvh] flex flex-col items-center overflow-x-hidden">
      <div className="flex w-full flex-1 flex-col gap-10 items-center">
        <nav className="w-full flex shrink-0 justify-center border-b border-b-foreground/10 h-14">
          <div className="w-full max-w-5xl flex justify-center items-center p-3 px-5 text-sm">
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>

        <section className="w-full max-w-5xl flex-1 px-5 pb-12 space-y-6">
          <header className="space-y-2 text-center">
            <p className="text-md uppercase tracking-[0.22em]">Friends</p>
            <p className="text-md tracking-tight text-muted-foreground/80 font-medium text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
              Search by display name or part of a user id, open achievements, and follow people you care about.
            </p>
          </header>
          {hasEnvVars ? <FriendsPanel viewerId={userData.user.id} /> : null}
        </section>
      </div>
    </main>
  );
}

export default function FriendsPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-x-hidden">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <FriendsPageInner />
    </Suspense>
  );
}
