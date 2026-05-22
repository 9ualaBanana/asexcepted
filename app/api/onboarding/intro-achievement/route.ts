import { NextResponse } from "next/server";

import { seedIntroAchievementIfEmpty } from "@/lib/welcome/seed-intro-achievement";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await seedIntroAchievementIfEmpty(supabase, user.id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    created: result.created,
    achievementId: result.achievementId ?? null,
  });
}
