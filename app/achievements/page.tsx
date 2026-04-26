import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userAchievementsPath } from "@/lib/user-achievements-path";
import { Suspense } from "react";

/** Legacy URL → `/u/:userId` (Supabase Auth user id). */
async function LegacyAchievementsRedirect() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return redirect("/auth/login");
  }
  return redirect(userAchievementsPath(userData.user.id));
}

export default function LegacyAchievementsPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
      }
    >
      <LegacyAchievementsRedirect />
    </Suspense>
  );
}
