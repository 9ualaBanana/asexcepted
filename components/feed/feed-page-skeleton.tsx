import { AppPageShell } from "@/components/layout/app-page-shell";
import { SkeletonFeedRow } from "@/components/layout/page-skeleton-primitives";

export function FeedPageSkeleton() {
  return (
    <AppPageShell
      title="Feed"
      subtitle="Unlocks from people you follow"
      showBell={false}
    >
      <div className="space-y-3" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonFeedRow key={i} />
        ))}
      </div>
    </AppPageShell>
  );
}
