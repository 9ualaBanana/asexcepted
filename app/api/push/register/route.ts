import { NextResponse } from "next/server";
import { z } from "zod";

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

  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;
  const { error } = await supabase.from("push_notification_tokens" as any).upsert(
    {
      token: parsed.data.token,
      user_id: user.id,
      platform: "web",
      user_agent: userAgent,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const adminUserId = process.env.PUSH_ADMIN_USER_ID?.trim();
  if (adminUserId && user.id === adminUserId) {
    try {
      await getFirebaseAdminMessaging().subscribeToTopic(
        [parsed.data.token],
        "admin-signups",
      );
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json({ ok: true });
}
