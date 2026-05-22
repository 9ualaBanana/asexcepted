import type { AchievementRecord } from "@/components/achievements/achievement-transformers";

/** Shared ImageKit asset shown on welcome and seeded as the first locked achievement. */
export const INTRO_ACHIEVEMENT_ICON_URL =
  "https://ik.imagekit.io/gualabanana/achievements/intro_achievement.png";

export const INTRO_ACHIEVEMENT_SEED = {
  title: "%dopæminer%",
  description:
    // "Claim the first badge and start turning real moments into something worth keeping.",
    "Claim first badge to start promoting rewarding behavior.",
  category: "reward",
  icon: "trophy" as const,
  icon_url: INTRO_ACHIEVEMENT_ICON_URL,
  icon_file_id: null,
  tone: "teal" as const,
  is_locked: true,
  achieved_at: null,
};

const WELCOME_INTRO_ID = "welcome-intro-preview";

/** Static record for the marketing detail preview (not persisted). */
export function getWelcomeIntroAchievementRecord(): AchievementRecord {
  return {
    id: WELCOME_INTRO_ID,
    title: INTRO_ACHIEVEMENT_SEED.title,
    description: INTRO_ACHIEVEMENT_SEED.description,
    category: INTRO_ACHIEVEMENT_SEED.category,
    icon: INTRO_ACHIEVEMENT_SEED.icon,
    icon_url: INTRO_ACHIEVEMENT_SEED.icon_url,
    icon_file_id: INTRO_ACHIEVEMENT_SEED.icon_file_id,
    tone: INTRO_ACHIEVEMENT_SEED.tone,
    is_locked: true,
    achieved_at: INTRO_ACHIEVEMENT_SEED.achieved_at,
    created_at: "1970-01-01T00:00:00.000Z",
  };
}
