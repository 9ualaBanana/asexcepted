"use client";

import type { RefObject } from "react";
import { useDrag } from "@use-gesture/react";

import type { AlphaMaskData } from "@/lib/achievements/badge/parallax/shape-utils";
import { isOpaqueBadgeHit } from "@/lib/achievements/badge/parallax/shape-utils";
import { isLockedBadgeRefuseMotionEnabled } from "@/lib/achievements/ui/locked-badge-refuse-motion";
import { cn } from "@/lib/utils";

type LockedBadgeRefuseHitLayerProps = {
  enabled: boolean;
  onRefuse: () => void;
  alphaMaskRef: RefObject<AlphaMaskData | null>;
};

/** Hit target when locked badge has no unlock-hold (e.g. read-only detail). */
export function LockedBadgeRefuseHitLayer({
  enabled,
  onRefuse,
  alphaMaskRef,
}: LockedBadgeRefuseHitLayerProps) {
  const bind = useDrag(
    ({ tap, xy: [x, y], event }) => {
      if (!tap) return;
      const el = event.currentTarget;
      if (!(el instanceof Element)) return;
      if (
        !isOpaqueBadgeHit(
          x,
          y,
          el.getBoundingClientRect(),
          alphaMaskRef.current,
          "filled",
        )
      ) {
        return;
      }
      onRefuse();
    },
    {
      enabled: enabled && isLockedBadgeRefuseMotionEnabled(),
      filterTaps: true,
      threshold: 6,
      pointer: { capture: false },
    },
  );

  if (!enabled || !isLockedBadgeRefuseMotionEnabled()) return null;

  return (
    <button
      type="button"
      aria-label="Locked achievement"
      className={cn(
        "no-tap-highlight absolute inset-0 z-20 touch-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
      )}
      {...bind()}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
