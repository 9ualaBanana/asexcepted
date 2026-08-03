"use client";

import { BadgeSlot } from "@/components/achievements/badge/chrome/badge-slot";
import { BadgeGlitterLayer } from "@/components/achievements/badge/display/badge-glitter-layer";
import { BadgeImpressionLayer } from "@/components/achievements/badge/display/badge-impression-layer";
import { BadgeInteractiveContentLayer } from "@/components/achievements/badge/display/badge-interactive-content-layer";
import { BadgeLockLayer } from "@/components/achievements/badge/display/badge-lock-layer";
import { BadgeUnderlayLayer } from "@/components/achievements/badge/display/badge-underlay-layer";
import {
  badgeArtFromOptions,
  getBadgeContentMode,
  slotSizeFromFrame,
  type BadgeArtProps,
  type BadgeOptions,
} from "@/components/achievements/badge/display/badge-options";
import { BadgeSilhouetteLayer } from "@/components/achievements/badge/display/badge-silhouette-layer";
import { FallbackBadge } from "@/components/achievements/badge/display/fallback-badge";
import { cn } from "@/lib/utils";

type BadgeProps = {
  options: BadgeOptions;
};

export function Badge({ options }: BadgeProps) {
  const art = badgeArtFromOptions(options);
  const unlocking = Boolean(options.unlock?.active);
  const { isLiveViewer } = getBadgeContentMode(art.content);
  const liveKey = stableLiveArtKey(art);

  return (
    <BadgeSlot frame={options.frame}>
      <BadgeImpressionLayer impression={options.impression}>
        <BadgeLockLayer
          unlock={options.unlock}
          gesture={options.gesture}
          revealArt={
            unlocking ? (
              art.displaySrc && isLiveViewer ? (
                <BadgeInteractiveContentLayer
                  key={`${liveKey}:reveal`}
                  displaySrc={art.displaySrc}
                  model={art.model}
                  signedModelUrlProp={art.signedModelUrl}
                  motionSeed={art.motionSeed}
                  float={art.float}
                  content={art.content}
                  impressionEffect={art.impressionEffect}
                />
              ) : art.allowFallback ? (
                <FallbackBadge
                  tone={art.tone}
                  isLocked={false}
                  icon={art.icon}
                  size={slotSizeFromFrame(art.frame)}
                />
              ) : null
            ) : null
          }
        >
          <div className={cn("relative h-full w-full", art.className)}>
            <BadgeSilhouetteLayer
              silhouette={art.silhouette}
              locked={art.locked}
              src={art.displaySrc}
            />
            <BadgeUnderlayLayer
              locked={art.locked}
              thumbnailSrc={art.displaySrc}
              content={art.content}
              allowFallback={art.allowFallback}
              icon={art.icon}
              tone={art.tone}
              frame={art.frame}
              liveArt={
                isLiveViewer && !art.locked && !unlocking ? (
                  <BadgeInteractiveContentLayer
                    key={`${liveKey}:underlay`}
                    displaySrc={art.displaySrc}
                    model={art.model}
                    signedModelUrlProp={art.signedModelUrl}
                    motionSeed={art.motionSeed}
                    float={art.float}
                    content={art.content}
                    impressionEffect={art.impressionEffect}
                  />
                ) : null
              }
            />
            <BadgeGlitterLayer
              dedicatedEffect={art.dedicatedEffect}
              displaySrc={art.displaySrc}
              motionSeed={art.motionSeed}
              frame={art.frame}
            />
          </div>
        </BadgeLockLayer>
      </BadgeImpressionLayer>
    </BadgeSlot>
  );
}

function stableLiveArtKey(art: BadgeArtProps): string {
  return art.model?.assetPath?.trim() || art.motionSeed;
}
