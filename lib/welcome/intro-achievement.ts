import type { AchievementRecord } from "@/lib/achievements/achievement-transformers";

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
  icon_asset_kind: "image" as const,
  icon_asset_path: null,
  icon_cc_attribution: null,
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
    icon_asset_kind: INTRO_ACHIEVEMENT_SEED.icon_asset_kind,
    icon_asset_path: INTRO_ACHIEVEMENT_SEED.icon_asset_path,
    icon_cc_attribution: INTRO_ACHIEVEMENT_SEED.icon_cc_attribution,
    icon_model_yaw: 0,
    icon_model_pitch: 0,
    icon_model_animation_play: true,
    icon_model_animation_speed: 1,
    tone: INTRO_ACHIEVEMENT_SEED.tone,
    is_locked: true,
    achieved_at: INTRO_ACHIEVEMENT_SEED.achieved_at,
    created_at: "1970-01-01T00:00:00.000Z",
    impression_count: 0,
    visibility: "public",
    dedicated_by_user_id: null,
    dedication_status: null,
  };
}
