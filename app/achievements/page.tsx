import { AuthButton } from "@/components/auth-button";
import { AchievementsManager } from "@/components/achievements/achievements-manager";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";

export default function AchievementsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center overflow-x-hidden">
      <div className="flex-1 w-full flex flex-col gap-12 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>

        <section className="w-full max-w-5xl px-5 pb-8 space-y-6">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Achievements
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Regard rewards you deserved
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Gain experience by promoting rewarding behavior.<br />
              Exceptional, uniquely novel or consistently committed to
              developing good habit or breaking bad.<br />
              You deserve regard and reward for your achievements.
            </p>
          </header>
          <AchievementsManager />
        </section>
      </div>
    </main>
  );
}
