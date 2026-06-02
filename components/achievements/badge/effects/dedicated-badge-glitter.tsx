"use client";

import { useMemo } from "react";

import { ImpressionGlitterField } from "@/components/achievements/badge/effects/impression-glitter-field";
import { badgeImageMaskStylePadded } from "@/lib/achievements/badge/parallax/badge-mask-style";
import { cn } from "@/lib/utils";

type DedicatedBadgeGlitterProps = {
  renderSrc: string | null;
  motionSeed: string;
  variant?: "detail" | "grid";
  overlay?: boolean;
  className?: string;
};

/** Warm particle field for dedicated achievements (grid, feed, dialog). */
export function DedicatedBadgeGlitter({
  renderSrc,
  motionSeed,
  variant = "grid",
  overlay = true,
  className,
}: DedicatedBadgeGlitterProps) {
  const maskStyle = useMemo(
    () => (renderSrc ? badgeImageMaskStylePadded(renderSrc, 108) : null),
    [renderSrc],
  );

  if (!renderSrc || !maskStyle) return null;

  return (
    <ImpressionGlitterField
      active
      motionSeed={motionSeed}
      maskStyle={maskStyle}
      variant={variant}
      overlay={overlay}
      className={cn(className)}
    />
  );
}
