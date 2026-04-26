import { notFound } from "next/navigation";
import { AuthButton } from "@/components/auth-button";
import { AchievementsManager } from "@/components/achievements/achievements-manager";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { isAuthUserIdSegment } from "@/lib/user-achievements-path";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ userId: string }>;
};

/** `userId` is Supabase Auth user id (`auth.users.id`). Owners edit; everyone else (including signed out) can view. */
async function UserAchievementsContent({ params }: PageProps) {
  const { userId } = await params;
  if (!isAuthUserIdSegment(userId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const isOwner = Boolean(user?.id === userId);
  const readOnly = !isOwner;

  return (
    <main className="min-h-screen flex flex-col items-center overflow-x-hidden">
      <div className="flex-1 w-full flex flex-col gap-10 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-14">
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

        <section className="w-full max-w-5xl px-5 pb-8 space-y-4">
          <header className="space-y-2">
            <p className="text-md uppercase tracking-[0.22em] text-center">
              Achievements
            </p>
            <p className="text-md tracking-tight text-center text-muted-foreground/80 font-medium text-xs sm:text-sm leading-relaxed">
              {isOwner ? (
                <>
                  Recognize your own unique experience<br />
                  Collect achievements you deserve<br />
                </>
              ) : (
                <>
                  Viewing this member&apos;s public achievements.<br />
                  Sign in to manage your own collection.
                </>
              )}
            </p>
          </header>
          <AchievementsManager ownerUserId={userId} readOnly={readOnly} />
        </section>
      </div>
    </main>
  );
}

export default function UserAchievementsPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col items-center justify-center overflow-x-hidden">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <UserAchievementsContent {...props} />
    </Suspense>
  );
}
