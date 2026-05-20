import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FriendsPanel } from "@/components/social/friends-panel";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { SocialPageSkeleton } from "@/components/social/social-page-skeleton";
import { createClient } from "@/lib/supabase/server";
import { loginWithNext, ROUTES } from "@/lib/routes";

async function SocialPageInner() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return redirect(loginWithNext(ROUTES.social));
  }

  return (
    <AppPageShell
      title="Inspa"
      subtitle="Inspire and get inspired by people you care about"
    >
      <FriendsPanel viewerId={userData.user.id} />
    </AppPageShell>
  );
}

export default function SocialPage() {
  return (
    <Suspense fallback={<SocialPageSkeleton />}>
      <SocialPageInner />
    </Suspense>
  );
}
