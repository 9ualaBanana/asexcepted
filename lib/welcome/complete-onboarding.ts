import type { SupabaseClient } from "@supabase/supabase-js";

import { resetHideLockedPreferenceForNewAccount } from "@/lib/achievements/hide-locked-preference";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { userCollection } from "@/lib/routes";
import { onboardingAchievementDetailPath } from "@/lib/welcome/onboarding-redirect";
import { seedIntroAchievementIfEmpty } from "@/lib/welcome/seed-intro-achievement";

/**
 * Seed the intro achievement and return the post-sign-up path.
 * Uses the browser Supabase client so the session from signUp is available
 * immediately (a fetch to the API route can run before auth cookies are set).
 */
export async function completeOnboardingAfterSignup(
  userId: string,
  supabase?: SupabaseClient<Database>,
): Promise<string> {
  resetHideLockedPreferenceForNewAccount();

  const client = supabase ?? createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user || user.id !== userId) {
    return userCollection(userId);
  }

  const result = await seedIntroAchievementIfEmpty(client, userId);
  const achievementId = result.achievementId?.trim();
  if (achievementId) {
    return onboardingAchievementDetailPath(userId, achievementId);
  }

  return userCollection(userId);
}
