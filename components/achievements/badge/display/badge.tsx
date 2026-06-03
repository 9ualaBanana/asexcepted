"use client";

import { BadgeSlot } from "@/components/achievements/badge/chrome/badge-slot";
import { BadgeGlitterLayer } from "@/components/achievements/badge/display/badge-glitter-layer";
import { BadgeImpressionLayer } from "@/components/achievements/badge/display/badge-impression-layer";
import { BadgeLiveContentProvider } from "@/components/achievements/badge/display/badge-live-content";
import { BadgeLockLayer } from "@/components/achievements/badge/display/badge-lock-layer";
import { BadgeUnderlayLayer } from "@/components/achievements/badge/display/badge-underlay-layer";
import {
  badgeArtFromOptions,
  badgeLiveVisualFromArt,
  type BadgeOptions,
} from "@/components/achievements/badge/display/badge-options";
import { BadgeSilhouetteLayer } from "@/components/achievements/badge/display/badge-silhouette-layer";
import { cn } from "@/lib/utils";

type BadgeProps = {
  options: BadgeOptions;
};

export function Badge({ options }: BadgeProps) {
  const art = badgeArtFromOptions(options);

  return (
    <BadgeSlot frame={options.frame}>
      <BadgeImpressionLayer impression={options.impression}>
        <BadgeLiveContentProvider liveVisual={badgeLiveVisualFromArt(art)}>
          <BadgeLockLayer unlock={options.unlock} locked={art.locked}>
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
              />
              <BadgeGlitterLayer
                glitter={art.glitter}
                displaySrc={art.displaySrc}
                motionSeed={art.motionSeed}
                frame={art.frame}
                content={art.content}
              />
            </div>
          </BadgeLockLayer>
        </BadgeLiveContentProvider>
      </BadgeImpressionLayer>
    </BadgeSlot>
  );
}
