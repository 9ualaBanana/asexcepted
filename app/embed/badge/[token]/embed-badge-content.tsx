import { connection } from "next/server";
import { notFound } from "next/navigation";

import {
  BadgeGltfViewer,
  BadgeParallaxViewer,
} from "@/components/achievements/badge";
import { createSignedBadgeModelUrl } from "@/lib/achievements/badge/shared/badge-assets-server";
import { isModelBadgeAssetKind } from "@/lib/achievements/badge/shared/badge-assets";
import { toOptimizedRenderSrc } from "@/lib/achievements/badge/shared/render-src";
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
  const data = badgeResult.value;
  const iconUrl = data.icon_url;
  if (!iconUrl) {
    notFound();
  }
  const src = toOptimizedRenderSrc(iconUrl);
  const liveModelUrl =
    isModelBadgeAssetKind(data.icon_asset_kind) && data.icon_asset_path?.trim()
      ? await createSignedBadgeModelUrl(data.icon_asset_path)
      : null;

  return (
    <div className="flex min-h-dvh min-h-[100dvh] items-center justify-center bg-transparent p-4">
      <EmbedTransparentSurface />
      <div className="h-[min(88vmin,20rem)] w-[min(88vmin,20rem)] max-h-[90dvh] max-w-[90dvw]">
        {liveModelUrl ? (
          <BadgeGltfViewer
            signedModelUrl={liveModelUrl}
            previewSrc={src}
            className="p-1"
            float
            motionSeed={payload.achievementId}
            initialYaw={data.icon_model_yaw ?? 0}
            initialPitch={data.icon_model_pitch ?? 0}
          />
        ) : (
          <BadgeParallaxViewer
            src={src}
            className="p-1"
            float
            motionSeed={payload.achievementId}
          />
        )}
      </div>
    </div>
  );
}
