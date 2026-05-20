import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildFcmWebPushMessage,
  formatUnlockPushCopy,
} from "@/lib/push/build-fcm-message";
import { getFirebaseAdminMessaging } from "@/lib/push/firebase-admin";
import { userCollection } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  achievementId: z.string().uuid(),
});

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

function displayNameFromMetadata(meta: Record<string, unknown> | null | undefined) {
  if (!meta) return "Someone";
  const v = meta.display_name ?? meta.full_name ?? meta.name;
  if (typeof v === "string" && v.trim()) return v.trim();
  return "Someone";
}

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
    .select("id, user_id, title, is_locked")
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

  const actorName = displayNameFromMetadata(
    user.user_metadata as Record<string, unknown>,
  );
  const { title, body } = formatUnlockPushCopy({
    actorName,
    achievementTitle: achievement.title ?? "Achievement",
  });
  const url = userCollection(user.id);

  const { data: follows, error: followError } = await supabase
    .from("profile_follow")
    .select("follower_id")
    .eq("following_id", user.id);

  if (followError) {
    return NextResponse.json({ error: followError.message }, { status: 500 });
  }

  const followerIds = (follows ?? []).map((r) => r.follower_id);
  if (followerIds.length === 0) {
    return NextResponse.json({ ok: true, requested: 0, successCount: 0, failureCount: 0 });
  }

  const { data: tokenRows, error: tokenError } = await supabase
    .from("push_notification_tokens" as any)
    .select("token")
    .in("user_id", followerIds);

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  const tokens = [
    ...new Set(
      Array.isArray(tokenRows)
        ? (tokenRows as Array<{ token?: string | null }>)
            .map((row) => row.token?.trim() ?? "")
            .filter((token): token is string => token.length > 0)
        : [],
    ),
  ];

  if (tokens.length === 0) {
    return NextResponse.json({ ok: true, requested: 0, successCount: 0, failureCount: 0 });
  }

  const message = buildFcmWebPushMessage({
    tokens,
    title,
    body,
    url,
    type: "unlock",
  });

  const result = await getFirebaseAdminMessaging().sendEachForMulticast(message);

  const staleTokens: string[] = [];
  result.responses.forEach((response, index) => {
    if (response.success) return;
    const code = response.error?.code;
    if (code && INVALID_TOKEN_CODES.has(code)) {
      staleTokens.push(tokens[index]!);
    }
  });

  if (staleTokens.length > 0) {
    await supabase
      .from("push_notification_tokens" as any)
      .delete()
      .in("token", staleTokens);
  }

  return NextResponse.json({
    ok: true,
    requested: tokens.length,
    successCount: result.successCount,
    failureCount: result.failureCount,
  });
}
