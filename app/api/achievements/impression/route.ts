import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveDisplayName, sendPushToUsers } from "@/lib/notifications";
import { createServerSupabase } from "@/lib/supabase/clients/server";
import { createImpression } from "@/lib/achievements/application/impressions";

const bodySchema = z.object({
  achievementId: z.uuid(),
});

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
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

  const result = await createImpression(parsed.data.achievementId);

  if (result.isErr()) {
    const message = result.error ?? "Could not leave impression";
    const status =
      message.includes("cannot impress own") ||
      message.includes("cannot impress locked")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }

  if (!result.value.added) {
    return NextResponse.json({ ok: true, added: false });
  }

  const actorName = await resolveDisplayName(supabase, user.id);

  await sendPushToUsers({
    supabase,
    userIds: [result.value.owner_user_id],
    kind: "impression",
    params: {
      achievementTitle: result.value.title,
      actorName,
      ownerUserId: result.value.owner_user_id,
      achievementId: parsed.data.achievementId,
    },
    excludeUserIds: [user.id],
  });

  return NextResponse.json({ ok: true, added: true });
}
