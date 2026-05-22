import { userAchievementDetail } from "@/lib/routes";

/** Post-sign-up destination: collection with intro achievement detail open. */
export function onboardingAchievementDetailPath(
  userId: string,
  achievementId: string,
): string {
  return `${userAchievementDetail(userId, achievementId)}&onboarding=1`;
}
