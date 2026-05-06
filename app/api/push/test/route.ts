import { NextResponse } from "next/server";

import { getFirebaseAdminMessaging } from "@/lib/push/firebase-admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("push_notification_tokens" as any)
    .select("token")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tokens = Array.isArray(data)
    ? (data as Array<{ token?: string | null }>)
        .map((row: { token?: string | null }) => row.token?.trim() ?? "")
        .filter((token): token is string => token.length > 0)
    : [];

  if (tokens.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No registered push tokens for current user." },
      { status: 400 },
    );
  }

  const result = await getFirebaseAdminMessaging().sendEachForMulticast({
    tokens,
    notification: {
      title: "AsExcepted test notification",
      body: "Push is wired correctly for this profile.",
    },
    data: {
      event: "push.test",
      userId: user.id,
    },
  });

  return NextResponse.json({
    ok: true,
    requested: tokens.length,
    successCount: result.successCount,
    failureCount: result.failureCount,
  });
}
