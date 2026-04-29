import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { mintEmbedBadgeToken } from "@/lib/embed-badge-token";
import { allowRateLimit } from "@/lib/embed-rate-limit";
import { resolvePublicSiteOrigin } from "@/lib/public-site-origin";
import { createClient } from "@/lib/supabase/server";

type Body = {
  achievementId?: string;
};

function clientIp(h: Headers): string {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: Request) {
  const secret = process.env.EMBED_BADGE_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 16) {
    return NextResponse.json(
      { error: "Embeds are not configured (missing EMBED_BADGE_TOKEN_SECRET)." },
      { status: 503 },
    );
  }

  const h = await headers();
  const ip = clientIp(h);
  if (!allowRateLimit(`embed-mint-ip:${ip}`, 80, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!allowRateLimit(`embed-mint-user:${user.id}`, 40, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const achievementId = body.achievementId?.trim() ?? "";
  if (!achievementId) {
    return NextResponse.json({ error: "achievementId is required" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("achievements")
    .select("id,icon_url")
    .eq("id", achievementId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
  }
  const iconUrl = row.icon_url?.trim() ?? "";
  if (!iconUrl) {
    return NextResponse.json(
      { error: "Add a custom badge image before creating an embed link." },
      { status: 400 },
    );
  }

  const origin = await resolvePublicSiteOrigin();
  if (!origin) {
    return NextResponse.json(
      {
        error:
          "Could not determine public site URL. On Vercel, open the app from your deployment URL so Host headers are present, or set NEXT_PUBLIC_SITE_URL / VERCEL_URL.",
      },
      { status: 500 },
    );
  }

  // if (isLocalhostOrLoopbackOrigin(origin)) {
  //   return NextResponse.json(
  //     {
  //       error:
  //         "Embed links cannot use localhost. Deploy to staging or production and copy the link from that site (e.g. your Vercel preview URL).",
  //     },
  //     { status: 400 },
  //   );
  // }

  const token = mintEmbedBadgeToken(secret, row.id);
  const embedUrl = `${origin}/e/${encodeURIComponent(token)}`;
  return NextResponse.json({ embedUrl });
}
