import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSignupsTopic, getAdminUserId } from "@/lib/notifications";
import { getFirebaseAdminMessaging } from "@/lib/push/firebase-admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  token: z.string().trim().min(20),
  platform: z.string().trim().max(32).optional(),
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
  const { error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;
  }).rpc("claim_push_notification_token", {
    p_token: parsed.data.token,
    p_platform: parsed.data.platform ?? "web",
    p_user_agent: userAgent,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const adminUserId = getAdminUserId();
  if (adminUserId && user.id === adminUserId) {
    try {
      await getFirebaseAdminMessaging().subscribeToTopic(
        [parsed.data.token],
        getAdminSignupsTopic(),
      );
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json({ ok: true });
}
