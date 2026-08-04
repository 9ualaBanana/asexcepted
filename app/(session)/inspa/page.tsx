import { Suspense } from "react";

import { FeedList } from "@/components/social/feed/feed-list";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { FriendsPanel } from "@/components/social/friends-panel";
import { SocialPageSkeleton } from "@/components/social/inspa-page-skeleton";
import { requireSessionUser } from "@/lib/auth/require-session-user";
import { fetchFollowingUnlockFeed } from "@/lib/achievements/data/feed-db";

export default function InspaPage() {
  return (
    <Suspense fallback={<SocialPageSkeleton />}>
      <InspaPageInner />
    </Suspense>
  );
}

async function InspaPageInner() {
  const { supabase, user } = await requireSessionUser();

  const feedResult = await fetchFollowingUnlockFeed(supabase, { limit: 20 });
  const initialPage = feedResult.isOk()
    ? feedResult.value
    : { rows: [], nextCursor: null };

  return (
    <AppPageShell className="pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]">
      <div className="space-y-8 sm:space-y-10">
        <FriendsPanel viewerId={user.id} />
        <FeedList
          initialPage={initialPage}
          initialError={feedResult.isOk() ? null : feedResult.error}
        />
      </div>
    </AppPageShell>
  );
}
