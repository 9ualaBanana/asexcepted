import { AppPageShell } from "@/components/layout/app-page-shell";
import { FEED_BADGE_PX, FEED_ROW_HEIGHT_CLASS } from "@/lib/feed/feed-row-layout";
import { cn } from "@/lib/utils";

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

export function SkeletonFeedRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        FEED_ROW_HEIGHT_CLASS,
        "flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] py-2 pl-3.5 pr-3 sm:pl-4 sm:pr-3.5",
        className,
      )}
    >
      <div
        className="shrink-0 animate-pulse rounded-2xl bg-white/[0.08]"
        style={{ width: FEED_BADGE_PX, height: FEED_BADGE_PX }}
      />
      <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-1 py-0.5">
        <div className="h-3 w-36 max-w-full animate-pulse rounded bg-white/[0.08]" />
        <div className="h-3.5 w-48 max-w-full animate-pulse rounded bg-white/[0.06]" />
        <div className="h-2.5 w-16 animate-pulse rounded bg-white/[0.05]" />
      </div>
      <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-white/[0.06]" />
    </div>
  );
}
