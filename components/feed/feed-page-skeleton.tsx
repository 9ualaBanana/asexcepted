import { AppPageShell } from "@/components/layout/app-page-shell";
import { SkeletonFeedRow } from "@/components/layout/page-skeleton-primitives";

export function FeedPageSkeleton() {
  return (
    <AppPageShell>
      <div className="mx-auto max-w-lg space-y-3 sm:space-y-4" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonFeedRow key={i} />
        ))}
      </div>
    </AppPageShell>
  );
}
