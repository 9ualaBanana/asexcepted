import { NextResponse } from "next/server";
import { z } from "zod";

import { FOLLOWER_UNLOCK_NOTIFICATIONS_REQUIRE_PUBLIC_VISIBILITY } from "@/lib/achievements/unlock-notification-policy";
import { resolveDisplayName, sendPushToUsers } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  achievementId: z.string().uuid(),
});

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

  const { data: achievement, error: achError } = await supabase
    .from("achievements")
    .select("id, user_id, title, is_locked, visibility")
    .eq("id", parsed.data.achievementId)
    .single();

  if (achError || !achievement) {
    return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
  }

  if (achievement.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (achievement.is_locked) {
    return NextResponse.json({ error: "Achievement is still locked" }, { status: 400 });
  }

  if (
    FOLLOWER_UNLOCK_NOTIFICATIONS_REQUIRE_PUBLIC_VISIBILITY &&
    achievement.visibility !== "public"
  ) {
    return NextResponse.json({ ok: true, requested: 0, successCount: 0, failureCount: 0 });
  }

  const actorName = await resolveDisplayName(supabase, user.id);

  const { data: follows, error: followError } = await supabase
    .from("profile_follow")
    .select("follower_id")
    .eq("following_id", user.id);

  if (followError) {
    return NextResponse.json({ error: followError.message }, { status: 500 });
  }

  const followerIds = (follows ?? [])
    .map((r) => r.follower_id)
    .filter((id) => id !== user.id);

  if (followerIds.length === 0) {
    return NextResponse.json({ ok: true, requested: 0, successCount: 0, failureCount: 0 });
  }

  const result = await sendPushToUsers({
    supabase,
    userIds: followerIds,
    kind: "unlock",
    params: {
      actorName,
      achievementTitle: achievement.title ?? "Achievement",
      ownerUserId: user.id,
      achievementId: achievement.id,
    },
    excludeUserIds: [user.id],
  });

  return NextResponse.json({
    ok: true,
    requested: result.requested,
    successCount: result.successCount,
    failureCount: result.failureCount,
  });
}
