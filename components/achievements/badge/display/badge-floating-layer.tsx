"use client";

import type { ReactNode } from "react";

import { getCachedBadgeMotionStyle } from "@/lib/achievements/badge/shared/render-cache";

type BadgeFloatingLayerProps = {
  children: ReactNode;
  enabled: boolean;
  float: boolean;
  motionSeed: string;
  motionStartCentered?: boolean;
};

/** Float motion layer for interactive live viewers (GLB / parallax). */
export function BadgeFloatingLayer({
  children,
  enabled,
  float,
  motionSeed,
  motionStartCentered = false,
}: BadgeFloatingLayerProps) {
  if (!enabled || !float) {
    return children;
  }

  const motionStyle = getCachedBadgeMotionStyle(
    motionSeed.trim(),
    motionStartCentered,
  );

  return (
    <div className="relative h-full w-full">
      <div
        className="relative h-full w-full badge-object-float"
        style={motionStyle}
      >
        {children}
      </div>
    </div>
  );
}
