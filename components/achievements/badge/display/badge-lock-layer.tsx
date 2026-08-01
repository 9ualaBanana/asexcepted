"use client";

import type { ReactNode } from "react";

import type { BadgeUnlock } from "@/components/achievements/badge/display/badge-options";
import { BadgeUnlockHoldLayer } from "@/components/achievements/badge/display/badge-unlock-hold-layer";
import { UnlockRevealWave } from "@/components/achievements/badge/effects/unlock-reveal-wave";

type BadgeLockLayerProps = {
  unlock?: BadgeUnlock | null;
  locked: boolean;
  children: ReactNode;
  /** Live art shown inside the unlock wipe (only while unlocking). */
  revealArt?: ReactNode;
};

/** Unlock hold + reveal wave around the badge art stack. */
export function BadgeLockLayer({
  unlock,
  locked,
  children,
  revealArt,
}: BadgeLockLayerProps) {
  return (
    <div className="relative h-full w-full">
      <BadgeUnlockHoldLayer hold={unlock?.hold} locked={locked} />
      {children}
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
