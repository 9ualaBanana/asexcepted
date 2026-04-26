import { AuthButton } from "@/components/auth-button";
import { AchievementsManager } from "@/components/achievements/achievements-manager";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";

export default function AchievementsPage() {
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
              {/* Collect achievements for recognizing experience you've earned. */}
              Recognize your own unique experience<br />
              Collect achievements you deserve<br />
              {/* Promote rewarding behavior<br /> */}
            </p>
          </header>
          <AchievementsManager />
        </section>
      </div>
    </main>
  );
}
