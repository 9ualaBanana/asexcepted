import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FeedList } from "@/components/feed/feed-list";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { FriendsPanel } from "@/components/social/friends-panel";
import { SocialPageSkeleton } from "@/components/social/social-page-skeleton";
import { fetchFollowingUnlockFeed } from "@/lib/feed-db";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";

async function InspaPageInner() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return redirect(loginWithNext(ROUTES.inspa));
  }

  const feedResult = await fetchFollowingUnlockFeed(supabase, { limit: 20 });
  const initialPage = feedResult.isOk()
    ? feedResult.value
    : { rows: [], nextCursor: null };

  return (
    <AppPageShell
      title=""
      subtitle=""
      className="pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="space-y-8 sm:space-y-10">
        <FriendsPanel viewerId={userData.user.id} />
        <FeedList
          initialPage={initialPage}
          initialError={feedResult.isOk() ? null : feedResult.error}
        />
      </div>
    </AppPageShell>
  );
}

export default function InspaPage() {
  return (
    <Suspense fallback={<SocialPageSkeleton />}>
      <InspaPageInner />
    </Suspense>
  );
}
