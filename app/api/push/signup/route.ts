import { NextResponse } from "next/server";
import { z } from "zod";

import { sendAdminNewSignupPush } from "@/lib/notifications";
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

  await sendAdminNewSignupPush({
    supabase,
    userId: parsed.data.userId,
    email: parsed.data.email,
  });

  return NextResponse.json({ ok: true });
}
