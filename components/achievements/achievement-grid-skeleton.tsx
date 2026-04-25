import { cn } from "@/lib/utils";

const SKELETON_CELL_COUNT = 18;

function AchievementGridCellSkeleton() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col items-center gap-1.5 px-0.5 py-1"
    >
      <div
        className={cn(
          "aspect-square w-full max-w-[104px] animate-pulse rounded-3xl",
          "bg-gradient-to-br from-white/[0.1] to-white/[0.03]",
          "ring-1 ring-inset ring-white/10",
        )}
      />
      <div className="flex h-[2.7em] w-full max-w-[104px] flex-col justify-center gap-1.5 px-1">
        <div className="mx-auto h-2 w-[88%] max-w-[5.5rem] animate-pulse rounded-full bg-white/[0.08]" />
        <div className="mx-auto h-2 w-[62%] max-w-[4rem] animate-pulse rounded-full bg-white/[0.06]" />
      </div>
      <div className="h-2.5 w-11 animate-pulse rounded-full bg-white/[0.06]" />
    </div>
  );
}

/** Full-width grid shell matching the loaded achievements strip; fills remaining viewport. */
export function AchievementGridLoadingSkeleton() {
  return (
    <div
      className={cn(
        "-mx-2 flex min-h-[calc(100dvh-9.5rem)] flex-col rounded-none bg-background px-2 py-6",
        "sm:mx-0 sm:min-h-[calc(100dvh-10rem)] sm:rounded-2xl sm:px-4",
      )}
    >
      <div className="grid flex-1 grid-cols-3 content-start gap-x-2 gap-y-8">
        {Array.from({ length: SKELETON_CELL_COUNT }, (_, i) => (
          <AchievementGridCellSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
