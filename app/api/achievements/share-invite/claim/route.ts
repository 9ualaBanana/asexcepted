import { NextResponse } from "next/server";
import { z } from "zod";

import { claimAchievementShareInvite } from "@/lib/share-invites/server";
import { createClient } from "@/lib/supabase/server";

const claimBodySchema = z.object({
  token: z.string().min(1),
  autoAccept: z.boolean().default(false),
});

export async function POST(request: Request) {
  const body = claimBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid share invite claim payload." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to claim this invite." }, { status: 401 });
  }

  const result = await claimAchievementShareInvite({
    token: body.data.token,
    claimerUserId: user.id,
    autoAccept: body.data.autoAccept,
  });

  if (result.isErr()) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value);
}

