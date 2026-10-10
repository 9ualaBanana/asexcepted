import { NextResponse } from "next/server";
import { z } from "zod";

import { endAchievementCollaboration } from "@/lib/achievements/application/share-invite";
import { createServerSupabase } from "@/lib/supabase/clients/server";

const bodySchema = z.object({
  achievementId: z.uuid(),
});

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid collaboration payload." }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const result = await endAchievementCollaboration({
    actorUserId: user.id,
    achievementId: body.data.achievementId,
  });
  if (result.isErr()) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
