import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveDisplayName, sendPushToUsers } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  followingId: z.uuid(),
  followerId: z.uuid(),
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

  if (parsed.data.followerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.followerId === parsed.data.followingId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { data: followRow, error: followError } = await supabase
    .from("profile_follow")
    .select("follower_id")
    .eq("follower_id", parsed.data.followerId)
    .eq("following_id", parsed.data.followingId)
    .maybeSingle();

  if (followError) {
    return NextResponse.json({ error: followError.message }, { status: 500 });
  }

  if (!followRow) {
    return NextResponse.json({ error: "Follow relationship not found" }, { status: 400 });
  }

  const followerName = await resolveDisplayName(supabase, parsed.data.followerId);

  const result = await sendPushToUsers({
    supabase,
    userIds: [parsed.data.followingId],
    kind: "new_follower",
    params: { followerName },
  });

  return NextResponse.json({
    ok: true,
    requested: result.requested,
    successCount: result.successCount,
    failureCount: result.failureCount,
    firstErrorCode: result.firstErrorCode,
  });
}
