"use client";

import type { ReactNode } from "react";

import { useBadgeLiveContent } from "@/components/achievements/badge/display/badge-live-content";
import type { BadgeUnlock } from "@/components/achievements/badge/display/badge-options";
import { BadgeUnlockHoldLayer } from "@/components/achievements/badge/display/badge-unlock-hold-layer";
import { UnlockRevealWave } from "@/components/achievements/badge/effects/unlock-reveal-wave";

type BadgeLockLayerProps = {
  unlock?: BadgeUnlock | null;
  locked: boolean;
  children: ReactNode;
};

/** Unlock hold + reveal wave around the badge art stack. */
export function BadgeLockLayer({
  unlock,
  locked,
  children,
}: BadgeLockLayerProps) {
  const liveContent = useBadgeLiveContent();

  const unlockOverlay =
    unlock && liveContent ? (
      <div className="relative h-full w-full">{liveContent}</div>
    ) : null;

  return (
    <div className="relative h-full w-full">
      <BadgeUnlockHoldLayer hold={unlock?.hold} locked={locked} />
      {children}
      {unlock && unlockOverlay ? (
        <UnlockRevealWave
          isUnlocking={unlock.active}
          detailMaskStyle={unlock.maskStyle}
          unlockRevealClipPath={unlock.clipPath}
          reveal={unlockOverlay}
        />
      ) : null}
    </div>
  );
}
