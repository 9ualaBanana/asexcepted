import { NextResponse } from "next/server";
import { z } from "zod";

import { getFirebaseAdminMessaging } from "@/lib/push/firebase-admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().optional(),
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

  if (parsed.data.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const projectName = "AsExcepted";
  const body = parsed.data.email
    ? `New user signed up: ${parsed.data.email}`
    : `New user signed up: ${parsed.data.userId}`;

  try {
    await getFirebaseAdminMessaging().send({
      topic: "admin-signups",
      notification: {
        title: `${projectName}: New signup`,
        body,
      },
      data: {
        event: "auth.signup.succeeded",
        userId: parsed.data.userId,
      },
    });
  } catch {
    // Notification delivery is best-effort for this event endpoint.
  }

  return NextResponse.json({ ok: true });
}
