"use client";

import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";

import { getCachedBadgeMotionStyle } from "@/lib/achievements/badge/shared/render-cache";

type FloatingBadgeWrapperProps = {
  motionSeed?: string;
  sourceKey?: string;
  motionStartCentered?: boolean;
  fallbackSeed?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function FloatingBadgeWrapper({
  motionSeed,
  sourceKey,
  motionStartCentered = false,
  fallbackSeed = "badge",
  style,
  children,
}: FloatingBadgeWrapperProps) {
  const motionStyle = useMemo(() => {
    const key = (motionSeed ?? sourceKey ?? "").trim() || fallbackSeed;
    return getCachedBadgeMotionStyle(key, motionStartCentered);
  }, [fallbackSeed, motionSeed, motionStartCentered, sourceKey]);

  return (
    <div className="relative h-full w-full">
      <div
        className="relative h-full w-full badge-object-float"
        style={style ?? motionStyle}
      >
        {children}
      </div>
    </div>
  );
}
