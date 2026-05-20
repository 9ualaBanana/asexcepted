import { NextResponse } from "next/server";

import { buildFcmWebPushMessage } from "@/lib/push/build-fcm-message";
import { getFirebaseAdminMessaging } from "@/lib/push/firebase-admin";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

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

  const tokens = [
    ...new Set(
      Array.isArray(data)
        ? (data as Array<{ token?: string | null }>)
            .map((row) => row.token?.trim() ?? "")
            .filter((token): token is string => token.length > 0)
        : [],
    ),
  ];

  if (tokens.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No device token saved. Use the notification bell or Send test push to register first.",
      },
      { status: 400 },
    );
  }

  const message = buildFcmWebPushMessage({
    tokens,
    title: "AsExcepted test notification",
    body: "Push is wired correctly for this profile.",
    url: ROUTES.profile,
    type: "push.test",
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

  const firstError = result.responses.find((r) => !r.success)?.error?.code;

  return NextResponse.json({
    ok: true,
    requested: tokens.length,
    successCount: result.successCount,
    failureCount: result.failureCount,
    firstErrorCode: firstError ?? null,
  });
}
