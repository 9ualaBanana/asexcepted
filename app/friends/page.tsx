import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { AuthButton } from "@/components/auth-button";
import { FriendsPanel } from "@/components/social/friends-panel";
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
          <div className="relative w-full max-w-5xl flex justify-center items-center p-3 px-5 text-sm">
            <Suspense>
              <AuthButton />
            </Suspense>
            <button
              type="button"
              aria-label="Notifications"
              className="absolute right-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:text-white"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </nav>

        <section className="w-full max-w-5xl flex-1 px-5 pb-12 space-y-6">
          <header className="space-y-2 text-center">
            <p className="text-md uppercase tracking-[0.22em]">Inspa</p>
            <p className="text-md tracking-tight text-muted-foreground/80 font-medium text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
              Inspire and get inspired by people you care about
            </p>
          </header>
          <FriendsPanel viewerId={userData.user.id} />
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
