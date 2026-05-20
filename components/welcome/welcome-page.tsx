import Link from "next/link";
import { Trophy } from "lucide-react";
import { AchievementBadgeSlot } from "@/components/achievements/badge/achievement-badge-slot";
import { AchievementFallbackBadge } from "@/components/achievements/badge/achievement-fallback-badge";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export function WelcomePage() {
  return (
    <AppPageShell showBell={false} title="AsExcepted" subtitle="">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-10 text-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground/80">
            Collect and share achievements that matter
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground/80">
            Inspire others with what you have earned. Unlock badges, share your
            collection, and embed achievements anywhere.
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          <div
            className="pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full bg-white/[0.04] blur-3xl"
            aria-hidden
          />
          <AchievementBadgeSlot size="detail">
            <AchievementFallbackBadge
              tone="rose"
              isLocked={false}
              FallbackIcon={Trophy}
              size="detail"
            />
          </AchievementBadgeSlot>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3 sm:flex-row sm:max-w-none sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href={ROUTES.signUp}>Sign up</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={ROUTES.login}>Sign in</Link>
          </Button>
        </div>

        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Your collection. Your story.
        </p>
      </div>
    </AppPageShell>
  );
}
