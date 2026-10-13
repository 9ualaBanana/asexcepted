import { NextResponse } from "next/server";
import { z } from "zod";

import { getAchievementForUnlockPush } from "@/lib/achievements/persistence/achievements";
import { resolveDisplayName, sendPushToUsers } from "@/lib/notifications";
import {
  createServerSupabase,
  createServiceRoleSupabase,
} from "@/lib/supabase/clients/server";

const bodySchema = z.object({
  achievementId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
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

  const achievementResult = await getAchievementForUnlockPush(
    supabase,
    parsed.data.achievementId,
  );
  if (achievementResult.isErr()) {
    return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
  }
  const achievement = achievementResult.value;
  const partyIds = [achievement.user_id, achievement.collaborator_user_id].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );

  if (!partyIds.includes(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (achievement.is_locked) {
    return NextResponse.json({ error: "Achievement is still locked" }, { status: 400 });
  }

  if (
    process.env.NEXT_PUBLIC_FOLLOWER_UNLOCK_NOTIFICATIONS_REQUIRE_PUBLIC_VISIBILITY &&
    achievement.visibility !== "public"
  ) {
    return NextResponse.json({ ok: true, requested: 0, successCount: 0, failureCount: 0 });
  }

  const actorName = await resolveDisplayName(supabase, user.id);
  const admin = createServiceRoleSupabase();
  const { data: follows, error: followError } = await admin
    .from("profile_follow")
    .select("follower_id")
    .in("following_id", partyIds);

  if (followError) {
    return NextResponse.json({ error: followError.message }, { status: 500 });
  }

  const recipientIds = new Set(
    (follows ?? [])
      .map((row) => row.follower_id)
      .filter((id) => id !== user.id),
  );
  for (const partyId of partyIds) {
    if (partyId !== user.id) recipientIds.add(partyId);
  }

  if (recipientIds.size === 0) {
    return NextResponse.json({ ok: true, requested: 0, successCount: 0, failureCount: 0 });
  }

  const result = await sendPushToUsers({
    userIds: [...recipientIds],
    kind: "unlock",
    params: {
      actorName,
      achievementTitle: achievement.title ?? "Achievement",
      ownerUserId: achievement.user_id,
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
