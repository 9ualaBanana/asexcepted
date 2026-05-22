import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROUTES, safeRedirectPath } from "@/lib/routes";
import { onboardingAchievementDetailPath } from "@/lib/welcome/onboarding-redirect";
import { seedIntroAchievementIfEmpty } from "@/lib/welcome/seed-intro-achievement";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}${ROUTES.authError}?error=${encodeURIComponent("Missing auth code")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}${ROUTES.authError}?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const seed = await seedIntroAchievementIfEmpty(supabase, user.id);
    if (seed.created && seed.achievementId) {
      return NextResponse.redirect(
        `${origin}${onboardingAchievementDetailPath(user.id, seed.achievementId)}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
