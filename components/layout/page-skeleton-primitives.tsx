import {
  FEED_BADGE_PX,
  FEED_ROW_HEIGHT_CLASS,
} from "@/lib/feed/feed-row-layout";
import { cn } from "@/lib/utils";

export function SkeletonNavBar() {
  return (
    <nav className="w-full flex shrink-0 justify-center border-b border-b-foreground/10 h-14">
      <div className="w-full max-w-5xl flex justify-center items-center gap-3 p-3 px-5">
        <div className="h-4 w-24 animate-pulse rounded bg-white/[0.08]" />
      </div>
    </nav>
  );
}

export function SkeletonHeaderLines() {
  return (
    <header className="space-y-2 text-center">
      <div className="mx-auto h-4 w-28 animate-pulse rounded bg-white/[0.08]" />
      <div className="mx-auto h-3 w-56 max-w-full animate-pulse rounded bg-white/[0.06]" />
    </header>
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
