import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin";
import { formatDedicationActivityMessage } from "@/lib/notifications/activity-text";
import { deleteAchievementForOwner } from "@/lib/achievements/data/achievement-repository";
import {
  createDedicatedAchievement,
  parseDedicateAchievementBody,
} from "@/lib/achievements/data/dedicate-achievement";
import { resolveDisplayName, sendPushToUsers } from "@/lib/notifications";
import { createServerSupabase } from "@/lib/supabase/clients/server";
import { createServiceRoleSupabase } from "@/lib/supabase/clients/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user: admin },
  } = await supabase.auth.getUser();

  const denied = requireAdminUser(admin);
  if (denied) return denied;
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = parseDedicateAchievementBody(raw);
  if (parsed.isErr()) {
    return NextResponse.json({ error: parsed.error.message }, { status: parsed.error.status });
  }
  const body = parsed.value;

  if (body.recipientUserId === admin.id) {
    return NextResponse.json(
      { error: "Use your own collection to create achievements for yourself." },
      { status: 400 },
    );
  }

  const service = createServiceRoleSupabase();
  const insertResult = await createDedicatedAchievement({
    supabase: service,
    dedicatorUserId: admin.id,
    body,
  });

  if (insertResult.isErr()) {
    return NextResponse.json(
      { error: insertResult.error.message },
      { status: insertResult.error.status },
    );
  }
  const row = insertResult.value;

  const { error: eventError } = await service.from("achievement_dedication_events").insert({
    achievement_id: row.id,
    recipient_user_id: body.recipientUserId,
    sender_user_id: admin.id,
  });

  if (eventError) {
    void deleteAchievementForOwner(service, row.id, body.recipientUserId);
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  const sender = await resolveDisplayName(supabase, admin.id);
  const achievementTitle = row.title ?? "Achievement";

  await sendPushToUsers({
    supabase,
    userIds: [body.recipientUserId],
    kind: "dedication",
    params: {
      sender,
      achievementTitle,
      recipientUserId: body.recipientUserId,
      achievementId: row.id,
    },
    excludeUserIds: [admin.id],
  });

  return NextResponse.json({
    ok: true,
    achievementId: row.id,
    pushBody: formatDedicationActivityMessage(sender, achievementTitle),
  });
}
