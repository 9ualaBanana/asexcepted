import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveDisplayName, sendPushToUsers } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  achievementId: z.string().uuid(),
});

type RpcResult = {
  added: boolean;
  owner_user_id: string;
  title: string;
};

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

  const { data, error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("append_achievement_impression", {
    p_achievement_id: parsed.data.achievementId,
  });

  if (error) {
    const message = error.message ?? "Could not leave impression";
    const status =
      message.includes("cannot impress own") ||
      message.includes("cannot impress locked")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const result = data as RpcResult | null;
  if (!result?.added) {
    return NextResponse.json({ ok: true, added: false });
  }

  const actorName = await resolveDisplayName(supabase, user.id);

  await sendPushToUsers({
    supabase,
    userIds: [result.owner_user_id],
    kind: "impression",
    params: {
      achievementTitle: result.title,
      actorName,
      ownerUserId: result.owner_user_id,
      achievementId: parsed.data.achievementId,
    },
    excludeUserIds: [user.id],
  });

  return NextResponse.json({ ok: true, added: true });
}
