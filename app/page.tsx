import { redirect } from "next/navigation";
import { Suspense } from "react";
import { WelcomePage } from "@/components/welcome/welcome-page";
import { WelcomePageSkeleton } from "@/components/welcome/welcome-page-skeleton";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

async function HomePageInner() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    redirect(ROUTES.feed);
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
