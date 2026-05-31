import { connection } from "next/server";
import { notFound } from "next/navigation";

import {
  Badge3DViewer,
  BadgeModelViewer,
} from "@/components/achievements/badge";
import { createSignedBadgeModelUrl } from "@/lib/achievements/badge/badge-assets-server";
import { isModelBadgeAssetKind } from "@/lib/achievements/badge/badge-assets";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { verifyEmbedBadgeToken } from "@/lib/embed-badge-token";
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
  const { data, error } = await supabase
    .from("achievements")
    .select("icon_url,icon_asset_kind,icon_asset_path,icon_model_yaw,icon_model_pitch")
    .eq("id", payload.achievementId)
    .maybeSingle();

  if (error || !data?.icon_url?.trim()) {
    notFound();
  }

  const src = toOptimizedBadgeRenderSrc(data.icon_url.trim());
  const liveModelUrl =
    isModelBadgeAssetKind(data.icon_asset_kind) && data.icon_asset_path?.trim()
      ? await createSignedBadgeModelUrl(data.icon_asset_path)
      : null;

  return (
    <div className="flex min-h-dvh min-h-[100dvh] items-center justify-center bg-transparent p-4">
      <EmbedTransparentSurface />
      <div className="h-[min(88vmin,20rem)] w-[min(88vmin,20rem)] max-h-[90dvh] max-w-[90dvw]">
        {liveModelUrl ? (
          <BadgeModelViewer
            signedModelUrl={liveModelUrl}
            previewSrc={src}
            className="p-1"
            float
            motionSeed={payload.achievementId}
            initialYaw={data.icon_model_yaw ?? 0}
            initialPitch={data.icon_model_pitch ?? 0}
          />
        ) : (
          <Badge3DViewer
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
