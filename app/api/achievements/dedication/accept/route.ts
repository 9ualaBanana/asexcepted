import { NextResponse } from "next/server";
import { z } from "zod";

import { coerceAchievementDbRow } from "@/components/achievements/achievement-transformers";
import { notifyDedicationAccepted } from "@/lib/notifications/dedication-accepted";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  achievementId: z.uuid(),
});

const DEDICATION_ACCEPT_SELECT =
  "id,title,description,category,icon,icon_url,icon_file_id,icon_asset_kind,icon_asset_path,icon_cc_attribution,icon_model_yaw,icon_model_pitch,tone,is_locked,achieved_at,created_at,visibility,dedicated_by_user_id,dedication_status";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("achievements")
    .update({
      dedication_status: "accepted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.achievementId)
    .eq("user_id", user.id)
    .eq("dedication_status", "pending")
    .select(DEDICATION_ACCEPT_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "This dedication is no longer pending or was already accepted." },
      { status: 409 },
    );
  }

  let achievement;
  try {
    achievement = coerceAchievementDbRow(data as Record<string, unknown>);
  } catch {
    return NextResponse.json(
      { error: "Could not read dedication after accepting." },
      { status: 500 },
    );
  }

  void notifyDedicationAccepted({
    achievementId: achievement.id,
    supabase,
  }).catch(() => undefined);

  return NextResponse.json({ achievement });
}
