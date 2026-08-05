import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AccountMenu } from "@/components/layout/account-menu";
import { AchievementsManager } from "@/components/achievements/achievements-manager";
import { FollowButtonWrapper } from "@/components/social/follow-button";
import { buildAchievementAuthContext } from "@/lib/auth/achievement-ability";
import { createServerSupabase } from "@/lib/supabase/clients/server";
import {
  authUserExists,
  fetchPublicUserDisplayName,
  isAuthUserIdSegment,
  isUserFollowingProfile,
} from "@/lib/profile/follow";

type PageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ achievement?: string; dedication?: string }>;
};

export default function UserAchievementsPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col items-center justify-center overflow-x-hidden">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <UserAchievementsContent {...props} />
    </Suspense>
  );
}

async function UserAchievementsContent({ params, searchParams }: PageProps) {
  const { userId: rawUserId } = await params;
  const { achievement: achievementParam } = await searchParams;

  const userId = rawUserId.trim();
  if (!isAuthUserIdSegment(userId)) {
    notFound();
  }

  const supabase = await createServerSupabase();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const existsResult = await authUserExists(supabase, userId);
  if (existsResult.isErr() || !existsResult.value) {
    notFound();
  }

  const isOwner = viewer?.id === userId;
  let ownerPublicLabel: string | null = null;
  if (!isOwner) {
    const labelResult = await fetchPublicUserDisplayName(supabase, userId);
    if (labelResult.isErr()) {
      notFound();
    }
    ownerPublicLabel = labelResult.value;
  }

  const auth = buildAchievementAuthContext({
    isOwner,
    viewerUserId: viewer?.id,
  });

  let initialIsFollowing = false;
  if (viewer && !isOwner) {
    const followResult = await isUserFollowingProfile(
      supabase,
      viewer.id,
      userId,
    );
    initialIsFollowing = followResult.isOk() ? followResult.value : false;
  }

  return (
    <main className="min-h-screen flex flex-col items-center overflow-x-hidden">
      <div className="flex-1 w-full flex flex-col gap-10 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-14">
          <div className="relative w-full max-w-5xl flex justify-center items-center p-3 px-5 text-sm">
            <Suspense>
              <AccountMenu />
            </Suspense>
          </div>
        </nav>

        <section className="w-full max-w-5xl px-5 pb-8 space-y-2">
          <header className="space-y-1">
            <p className="text-md uppercase tracking-[0.22em] text-center">
              Achievements
            </p>
            <p className="text-md tracking-tight text-center text-muted-foreground/80 font-medium text-xs sm:text-sm leading-relaxed">
              {isOwner ? (
                <>
                  Recognize your own unique experience<br />
                  Collect achievements you deserve<br />
                </>
              ) : (
                <>
                  {ownerPublicLabel
                    ? `Viewing ${ownerPublicLabel}'s public achievements.`
                    : "Viewing public achievements."}
                </>
              )}
            </p>
          </header>
          {viewer && !isOwner ? (
            <div className="flex justify-center pb-1">
              <FollowButtonWrapper
                targetUserId={userId}
                initialFollowing={initialIsFollowing}
              />
            </div>
          ) : null}
          <Suspense
            fallback={
              <p className="text-center text-sm text-muted-foreground py-8">
                Loading achievements…
              </p>
            }
          >
            <AchievementsManager
              userId={userId}
              auth={auth}
              initialDetailAchievementId={achievementParam ?? null}
            />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
