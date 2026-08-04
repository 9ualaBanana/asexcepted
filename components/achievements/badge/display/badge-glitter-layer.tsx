"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  resolveBadgeEffectDensity,
  type BadgeFrame,
} from "@/components/achievements/badge/display/badge-options";
import { buildGlitterParticles } from "@/lib/achievements/badge/parallax/glitter-particles";
import {
  badgeImageMaskStylePadded,
  circularBadgeMaskStyle,
  paddedBadgeMaskStyle,
} from "@/lib/achievements/badge/parallax/badge-mask-style";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/dom/prefers-reduced-motion";

type BadgeGlitterLayerProps = {
  dedicatedEffect: boolean;
  displaySrc: string | null;
  motionSeed: string;
  frame: BadgeFrame;
};

const paletteClass: Record<
  ReturnType<typeof buildGlitterParticles>[number]["palette"],
  string
> = {
  gold: "bg-amber-200/90",
  champagne: "bg-yellow-100/85",
  cream: "bg-orange-50/90",
  rose: "bg-rose-200/80",
};

/** Dedicated particle field over badge art (image badges). */
export function BadgeGlitterLayer({
  dedicatedEffect,
  displaySrc,
  motionSeed,
  frame,
}: BadgeGlitterLayerProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const density = resolveBadgeEffectDensity(frame);

  const maskStyle = useMemo(
    () =>
      displaySrc
        ? badgeImageMaskStylePadded(displaySrc, 108)
        : paddedBadgeMaskStyle(circularBadgeMaskStyle(), 108),
    [displaySrc],
  );

  const particleCount = density === "grid" ? 22 : 44;
  const particles = useMemo(
    () =>
      buildGlitterParticles(motionSeed, particleCount, {
        marginPct: 8,
        maxDriftPx: 9,
        ...(density === "detail"
          ? { sizeMinPx: 3, sizeRangePx: 2.8 }
          : { sizeMinPx: 2, sizeRangePx: 2.2 }),
      }),
    [motionSeed, particleCount, density],
  );

  useEffect(() => {
    setReduceMotion(prefersReducedMotion());
  }, []);

  if (!dedicatedEffect || !displaySrc) {
    return null;
  }

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-[11%]",
        density === "grid" ? "z-[12]" : "z-[18]",
      )}
      style={maskStyle}
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={cn(
            "absolute rounded-full will-change-transform",
            !reduceMotion && "impression-glitter-particle",
            paletteClass[particle.palette],
          )}
          style={
            {
              left: `${particle.leftPct}%`,
              top: `${particle.topPct}%`,
              width: particle.sizePx,
              height: particle.sizePx,
              "--glitter-dx": `${particle.driftX}px`,
              "--glitter-dy": `${particle.driftY}px`,
              "--glitter-delay": `${particle.delayMs}ms`,
              "--glitter-duration": `${particle.durationMs}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
