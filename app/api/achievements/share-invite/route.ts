import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import { achievementShareInvitePath } from "@/lib/routes";
import {
  createAchievementShareInviteFromExistingAchievement,
  createAchievementShareInviteFromPayload,
} from "@/lib/share-invites/server";

const draftPayloadSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  icon: z.string().optional(),
  icon_url: z.string().nullable().optional(),
  icon_file_id: z.string().nullable().optional(),
  tone: z.string().nullable().optional(),
  achieved_at: z.string().nullable().optional(),
  is_locked: z.boolean().optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

const createShareInviteBodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    achievementId: z.string().uuid(),
  }),
  z.object({
    mode: z.literal("draft"),
    payload: draftPayloadSchema,
  }),
]);

export async function POST(request: Request) {
  const body = createShareInviteBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid share invite payload." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to share achievements." }, { status: 401 });
  }

  const result =
    body.data.mode === "existing"
      ? await createAchievementShareInviteFromExistingAchievement({
          senderUserId: user.id,
          achievementId: body.data.achievementId,
        })
      : await createAchievementShareInviteFromPayload({
          senderUserId: user.id,
          payload: {
            title: body.data.payload.title ?? null,
            description: body.data.payload.description ?? null,
            category: body.data.payload.category ?? null,
            icon: body.data.payload.icon ?? "trophy",
            icon_url: body.data.payload.icon_url ?? null,
            icon_file_id: body.data.payload.icon_file_id ?? null,
            tone: body.data.payload.tone ?? null,
            achieved_at: body.data.payload.achieved_at ?? null,
            is_locked: true,
            visibility: "public",
          },
        });

  if (result.isErr()) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const origin = await resolvePublicSiteOrigin();
  if (!origin) {
    return NextResponse.json({ error: "Could not resolve a public site URL." }, { status: 500 });
  }

  const sharePath = achievementShareInvitePath(result.value.token);
  return NextResponse.json({
    shareUrl: `${origin}${sharePath}`,
  });
}

