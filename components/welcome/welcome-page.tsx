"use client";

import { WelcomeAchievementShowcase } from "@/components/welcome/welcome-achievement-showcase";
import { WelcomeCollectButton } from "@/components/welcome/welcome-collect-button";

export function WelcomePage() {
  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none bg-[#14121c] text-[#f5f3ff]">
      <div className="relative z-10 flex h-[100dvh] max-h-[100dvh] w-full flex-col px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2">
          <header className="w-full max-w-md space-y-1 text-center">
            {/* <h1 className="text-balance text-lg font-semibold uppercase leading-snug tracking-tight text-white sm:text-2xl">life&apos;s &apos;bout seen&apos;n&apos;done</h1> */}
            <h1 className="text-balance text-lg font-semibold smallcaps leading-snug tracking-tight text-white sm:text-2xl">
              <span className="text-emerald-200/70">visualize</span> to <span className="text-emerald-200/70">realize</span>
            </h1>
          </header>
        </div>

        <div className="flex w-full shrink-0 flex-col items-center justify-center">
          <WelcomeAchievementShowcase />
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <WelcomeCollectButton />
        </div>
      </div>
    </div>
  );
}
