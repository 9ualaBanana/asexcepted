"use client";

import type { ReactNode } from "react";

import type {
  BadgeGesture,
  BadgeUnlock,
} from "@/components/achievements/badge/display/badge-options";
import { BadgeGestureLayer } from "@/components/achievements/badge/display/badge-gesture-layer";
import { UnlockRevealWave } from "@/components/achievements/badge/effects/unlock-reveal-wave";

type BadgeLockLayerProps = {
  unlock?: BadgeUnlock | null;
  gesture?: BadgeGesture | null;
  children: ReactNode;
  revealArt?: ReactNode;
};

export function BadgeLockLayer({
  unlock,
  gesture,
  children,
  revealArt,
}: BadgeLockLayerProps) {
  return (
    <div className="relative h-full w-full">
      <BadgeGestureLayer gesture={gesture}>
        {children}
      </BadgeGestureLayer>
      {unlock?.active && revealArt ? (
        <UnlockRevealWave
          isUnlocking
          detailMaskStyle={unlock.maskStyle}
          clipPathRef={unlock.clipPathRef}
          reveal={<div className="relative h-full w-full">{revealArt}</div>}
        />
      ) : null}
    </div>
  );
}
