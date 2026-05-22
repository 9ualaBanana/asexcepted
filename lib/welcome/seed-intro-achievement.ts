import { createAchievement, listAchievements } from "@/components/achievements/achievement-db";
import { INTRO_ACHIEVEMENT_SEED } from "@/lib/welcome/intro-achievement";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function seedIntroAchievementIfEmpty(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ created: boolean; achievementId?: string; error?: string }> {
  const existing = await listAchievements(supabase, userId);
  if (existing.isErr()) {
    return { created: false, error: existing.error };
  }
  if (existing.value.length > 0) {
    const intro = existing.value.find(
      (a) =>
        a.icon_url === INTRO_ACHIEVEMENT_SEED.icon_url &&
        a.title === INTRO_ACHIEVEMENT_SEED.title,
    );
    return { created: false, achievementId: intro?.id };
  }

  const result = await createAchievement(supabase, {
    title: INTRO_ACHIEVEMENT_SEED.title,
    description: INTRO_ACHIEVEMENT_SEED.description,
    category: INTRO_ACHIEVEMENT_SEED.category,
    icon: INTRO_ACHIEVEMENT_SEED.icon,
    icon_url: INTRO_ACHIEVEMENT_SEED.icon_url,
    icon_file_id: INTRO_ACHIEVEMENT_SEED.icon_file_id,
    tone: INTRO_ACHIEVEMENT_SEED.tone,
    is_locked: INTRO_ACHIEVEMENT_SEED.is_locked,
    achieved_at: INTRO_ACHIEVEMENT_SEED.achieved_at,
  });

  if (result.isErr()) {
    return { created: false, error: result.error };
  }
  return { created: true, achievementId: result.value.id };
}
