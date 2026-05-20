import { ROUTES, userAchievementDetail } from "@/lib/routes";

export { userAchievementDetail };

export function notificationLinks() {
  return {
    feed: ROUTES.feed,
    social: ROUTES.social,
    profile: ROUTES.profile,
    home: ROUTES.home,
    userCollection: (userId: string) => `/u/${userId}`,
    achievementDetail: userAchievementDetail,
  };
}
