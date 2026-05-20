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
        "flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4",
        className,
      )}
    >
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-white/[0.08]" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3 w-32 animate-pulse rounded bg-white/[0.08]" />
        <div className="h-3 w-48 max-w-full animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-white/[0.06]" />
    </div>
  );
}
