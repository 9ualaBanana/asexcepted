"use client";

import { useMemo } from "react";

import { ImpressionGlitterField } from "@/components/achievements/badge/impression-glitter-field";
import { badgeImageMaskStylePadded } from "@/lib/achievements/badge-mask-style";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { cn } from "@/lib/utils";

type DedicatedBadgeGlitterProps = {
  renderSrc: string;
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
  const src = useMemo(() => toOptimizedBadgeRenderSrc(renderSrc.trim()), [renderSrc]);
  const maskStyle = useMemo(
    () => badgeImageMaskStylePadded(src, 108),
    [src],
  );

  if (!src) return null;

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
