import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabase } from "@/lib/supabase/clients/server";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import { achievementShareInvitePath } from "@/lib/routes";
import { createAchievementShareInvite } from "@/lib/achievements/application/share-invite";

const createShareInviteBodySchema = z.object({
  achievementId: z.uuid(),
  intent: z.enum(["showcase", "dedicate"]).default("showcase"),
});

export async function POST(request: Request) {
  const body = createShareInviteBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid share invite payload." }, { status: 400 });
  }
  const { achievementId, intent } = body.data;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to share achievements." }, { status: 401 });
  }

  const createShareInviteResult = await createAchievementShareInvite({
    senderUserId: user.id,
    achievementId,
    intent,
  });

  if (createShareInviteResult.isErr()) {
    return NextResponse.json({ error: createShareInviteResult.error }, { status: 400 });
  }

  const origin = await resolvePublicSiteOrigin();
  if (!origin) {
    return NextResponse.json({ error: "Could not resolve a public site URL." }, { status: 500 });
  }

  const sharePath = achievementShareInvitePath(createShareInviteResult.value.token);
  return NextResponse.json({
    shareUrl: `${origin}${sharePath}`,
  });
}

