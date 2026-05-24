import { notFound } from "next/navigation";
import { AuthButton } from "@/components/auth-button";
import { AchievementsManager } from "@/components/achievements/achievements-manager";
import { FollowButton } from "@/components/social/follow-button";
import { isAdminUserId } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  fetchPublicUserDisplayName,
  isUserFollowingProfile,
} from "@/lib/user-profile-db";
import { isAuthUserIdSegment } from "@/lib/user-achievements-path";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ achievement?: string; dedication?: string }>;
};

/** `userId` is Supabase Auth user id (`auth.users.id`). Owners edit; everyone else (including signed out) can view. */
async function UserAchievementsContent({ params, searchParams }: PageProps) {
  const { userId } = await params;
  const { achievement: achievementParam } = await searchParams;
  if (!isAuthUserIdSegment(userId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const isOwner = Boolean(user?.id === userId);
  const readOnly = !isOwner;
  const viewerIsAdmin = Boolean(user && isAdminUserId(user.id));
  const canDedicate = viewerIsAdmin && !isOwner;

  let initialIsFollowing = false;
  if (user && !isOwner) {
    const followResult = await isUserFollowingProfile(supabase, user.id, userId);
    initialIsFollowing = followResult.isOk() ? followResult.value : false;
  }

  let ownerPublicLabel: string | null = null;
  if (!isOwner) {
    const labelResult = await fetchPublicUserDisplayName(supabase, userId);
    ownerPublicLabel = labelResult.isOk() ? labelResult.value : null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center overflow-x-hidden">
      <div className="flex-1 w-full flex flex-col gap-10 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-14">
          <div className="relative w-full max-w-5xl flex justify-center items-center p-3 px-5 text-sm">
            <Suspense>
              <AuthButton />
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
          {user && !isOwner ? (
            <div className="flex justify-center pb-1">
              <FollowButton
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
              readOnly={readOnly}
              isAdmin={viewerIsAdmin}
              canDedicate={canDedicate}
              initialDetailAchievementId={achievementParam ?? null}
            />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

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
