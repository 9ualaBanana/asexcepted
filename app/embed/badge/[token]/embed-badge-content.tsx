import { connection } from "next/server";

import { notFound } from "next/navigation";

import { Badge } from "@/components/achievements/badge/display/badge";
import { badgeOptionsForEmbed } from "@/components/achievements/badge/display/badge-presets";
import { createSignedBadgeModelUrl } from "@/lib/achievements/badge/shared/badge-assets-server";
import { getAchievementEmbedBadgeById } from "@/lib/achievements/data/achievement-queries";
import { verifyEmbedBadgeToken } from "@/lib/embed/embed-badge-token";
import { createAnonServerClient } from "@/lib/supabase/server-anon";

import { EmbedTransparentSurface } from "./embed-transparent-surface";

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
  const badgeResult = await getAchievementEmbedBadgeById(supabase, payload.achievementId);

  if (badgeResult.isErr()) {
    notFound();
  }

  const badge = badgeResult.value;
  if (!badge.renderSrc) {
    notFound();
  }
  const liveModelUrl = badge.model
    ? await createSignedBadgeModelUrl(badge.model.assetPath)
    : null;

  return (
    <div className="flex min-h-dvh min-h-[100dvh] items-center justify-center bg-transparent p-4">
      <EmbedTransparentSurface />
      <div className="h-[min(88vmin,20rem)] w-[min(88vmin,20rem)] max-h-[90dvh] max-w-[90dvw]">
        <Badge
          options={badgeOptionsForEmbed({
            achievementId: payload.achievementId,
            displaySrc: badge.renderSrc,
            model: badge.model,
            signedModelUrl: liveModelUrl,
          })}
        />
      </div>
    </div>
  );
}
