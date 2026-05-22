export function WelcomePageSkeleton() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#14121c]">
      <div className="flex h-[100dvh] flex-col px-4 pb-4 pt-4">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-md space-y-2 text-center">
            <div className="mx-auto h-3 w-28 animate-pulse rounded bg-white/[0.08]" />
            <div className="mx-auto h-7 w-56 animate-pulse rounded bg-white/[0.1]" />
          </div>
        </div>
        <div className="h-[min(78vw,18rem)] w-[min(78vw,18rem)] shrink-0 animate-pulse rounded-full bg-white/[0.08]" />
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="h-11 w-36 animate-pulse rounded-full bg-white/[0.08]" />
        </div>
      </div>
    </div>
  );
}
