import { createClient } from "@/lib/supabase/server";
import { ROUTES, safeRedirectPath } from "@/lib/routes";
import { onboardingAchievementDetailPath } from "@/lib/welcome/onboarding-redirect";
import { seedIntroAchievementIfEmpty } from "@/lib/welcome/seed-intro-achievement";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const seed = await seedIntroAchievementIfEmpty(supabase, user.id);
        if (seed.created && seed.achievementId) {
          redirect(onboardingAchievementDetailPath(user.id, seed.achievementId));
        }
      }
      redirect(next);
    }
    redirect(`${ROUTES.authError}?error=${encodeURIComponent(error?.message ?? "Verification failed")}`);
  }

  redirect(`${ROUTES.authError}?error=${encodeURIComponent("No token hash or type")}`);
}
