import { SkeletonHeaderLines, SkeletonNavBar } from "@/components/layout/page-skeleton-primitives";

export function WelcomePageSkeleton() {
  return (
    <main className="relative min-h-[100dvh] flex flex-col items-center overflow-x-hidden">
      <div className="flex w-full flex-1 flex-col gap-10 items-center">
        <SkeletonNavBar />
        <section className="w-full max-w-5xl flex-1 px-5 pb-12 space-y-10">
          <SkeletonHeaderLines />
          <div className="mx-auto flex max-w-lg flex-col items-center gap-10">
            <div className="h-16 w-16 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="flex w-full max-w-xs flex-col gap-3">
              <div className="h-10 w-full animate-pulse rounded-md bg-white/[0.08]" />
              <div className="h-10 w-full animate-pulse rounded-md bg-white/[0.06]" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
