import { AppPageShell } from "@/components/layout/app-page-shell";
import { SkeletonFeedRow } from "@/components/layout/page-skeleton-primitives";

export function SocialPageSkeleton() {
  return (
    <AppPageShell>
      <div className="space-y-8" aria-hidden>
        <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-3.5 shadow-[0_14px_38px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:p-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full border border-white/12 bg-white/[0.06]" />
          </div>
          <div className="mt-4 flex justify-center">
            <div className="h-4 w-36 rounded-full bg-white/[0.08]" />
          </div>
          <div className="mt-4 flex gap-3 overflow-hidden pb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-[4.6rem] shrink-0">
                <div className="mx-auto h-[4.15rem] w-[4.15rem] rounded-full border border-white/10 bg-white/[0.05] sm:h-[4.75rem] sm:w-[4.75rem]" />
                <div className="mx-auto mt-2 h-3 w-12 rounded-full bg-white/[0.07]" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonFeedRow key={i} />
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
