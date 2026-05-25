import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSignupsTopic, getAdminUserId } from "@/lib/admin";
import { getFirebaseAdminMessaging } from "@/lib/push/firebase-admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  token: z.string().trim().min(20),
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

  const { error } = await supabase
    .from("push_notification_tokens" as any)
    .delete()
    .eq("token", parsed.data.token)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const adminUserId = getAdminUserId();
  if (adminUserId && user.id === adminUserId) {
    try {
      await getFirebaseAdminMessaging().unsubscribeFromTopic(
        [parsed.data.token],
        getAdminSignupsTopic(),
      );
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json({ ok: true });
}
