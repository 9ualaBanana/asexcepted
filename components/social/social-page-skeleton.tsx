import { AppPageShell } from "@/components/layout/app-page-shell";
import { SkeletonFeedRow } from "@/components/layout/page-skeleton-primitives";

export function SocialPageSkeleton() {
  return (
    <AppPageShell
      title="Inspa"
      subtitle="Inspire and get inspired by people you care about"
    >
      <div className="space-y-3" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonFeedRow key={i} />
        ))}
      </div>
    </AppPageShell>
  );
}
