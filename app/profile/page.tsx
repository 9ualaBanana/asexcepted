import { redirect } from "next/navigation";
import { AuthButton } from "@/components/auth-button";
import { LogoutButton } from "@/components/logout-button";
import { ProfileSettings } from "@/components/profile/profile-settings";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function ProfilePageInner() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return redirect("/auth/login?next=/profile");
  }

  return (
    <main className="relative min-h-[100dvh] flex flex-col items-center overflow-x-hidden pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex w-full flex-1 flex-col gap-10 items-center">
        <nav className="w-full flex shrink-0 justify-center border-b border-b-foreground/10 h-14">
          <div className="w-full max-w-5xl flex justify-center items-center p-3 px-5 text-sm">
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </nav>

        <section className="w-full max-w-5xl flex-1 px-5 pb-8 space-y-4">
          <header className="space-y-2">
            <p className="text-md uppercase tracking-[0.22em] text-center">
              Profile
            </p>
            <p className="text-md tracking-tight text-center text-muted-foreground/80 font-medium text-xs sm:text-sm leading-relaxed">
              View and update the fields your Supabase Auth user can change from
              the client (including display name).
            </p>
          </header>
          <ProfileSettings />
        </section>
      </div>

      <footer
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center bg-background/95 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        aria-label="Account"
      >
        <LogoutButton />
      </footer>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-x-hidden">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}
