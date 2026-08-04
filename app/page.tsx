import { redirect } from "next/navigation";
import { Suspense } from "react";
import { WelcomePage } from "@/components/welcome/welcome-page";
import { WelcomePageSkeleton } from "@/components/welcome/welcome-page-skeleton";
import { ROUTES } from "@/lib/routes";
import { createServerSupabase } from "@/lib/supabase/clients/server";

async function HomePageInner() {
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    redirect(ROUTES.inspa);
  }
  return <WelcomePage />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<WelcomePageSkeleton />}>
      <HomePageInner />
    </Suspense>
  );
}
