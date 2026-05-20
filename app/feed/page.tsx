import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FeedList } from "@/components/feed/feed-list";
import { FeedPageSkeleton } from "@/components/feed/feed-page-skeleton";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { fetchFollowingUnlockFeed } from "@/lib/feed-db";
import { loginWithNext, ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

async function FeedPageInner() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(loginWithNext(ROUTES.feed));
  }

  const feedResult = await fetchFollowingUnlockFeed(supabase, { limit: 20 });
  const initialPage = feedResult.isOk()
    ? feedResult.value
    : { rows: [], nextCursor: null };

  return (
    <AppPageShell title="Feed" subtitle="Unlocks from people you follow">
      {!feedResult.isOk() ? (
        <p className="text-center text-sm text-red-500">{feedResult.error}</p>
      ) : null}
      <FeedList initialPage={initialPage} />
    </AppPageShell>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<FeedPageSkeleton />}>
      <FeedPageInner />
    </Suspense>
  );
}
