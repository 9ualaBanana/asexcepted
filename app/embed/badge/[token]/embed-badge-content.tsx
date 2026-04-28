import { connection } from "next/server";
import { notFound } from "next/navigation";

import { AchievementBadge3DViewer } from "@/components/achievements/achievement-badge-3d-viewer";
import { verifyEmbedBadgeToken } from "@/lib/embed-badge-token";
import { createAnonServerClient } from "@/lib/supabase/server-anon";

type Props = {
  params: Promise<{ token: string }>;
};

export async function EmbedBadgeContent({ params }: Props) {
  await connection();
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const secret = process.env.EMBED_BADGE_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 16) {
    notFound();
  }

  const payload = verifyEmbedBadgeToken(secret, token);
  if (!payload) {
    notFound();
  }

  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("achievements")
    .select("icon_url")
    .eq("id", payload.achievementId)
    .maybeSingle();

  if (error || !data?.icon_url?.trim()) {
    notFound();
  }

  const src = data.icon_url.trim();

  return (
    <div className="flex min-h-dvh min-h-[100dvh] items-center justify-center bg-[#0c0a10] p-4">
      <div className="h-[min(88vmin,20rem)] w-[min(88vmin,20rem)] max-h-[90dvh] max-w-[90dvw]">
        <AchievementBadge3DViewer
          src={src}
          className="p-1"
          interactive
          float
          motionSeed={payload.achievementId}
        />
      </div>
    </div>
  );
}
