"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  getBadgeContentMode,
  resolveBadgeGlitterVariant,
  type BadgeContent,
  type BadgeFrame,
  type BadgeGlitter,
} from "@/components/achievements/badge/display/badge-options";
import { buildGlitterParticles } from "@/lib/achievements/badge/parallax/glitter-particles";
import {
  badgeImageMaskStylePadded,
  circularBadgeMaskStyle,
  paddedBadgeMaskStyle,
} from "@/lib/achievements/badge/parallax/badge-mask-style";
import { cn } from "@/lib/utils";

type BadgeGlitterLayerProps = {
  glitter: BadgeGlitter;
  displaySrc: string | null;
  motionSeed: string;
  frame: BadgeFrame;
  content: BadgeContent;
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

/** Dedicated / impression glitter particles over badge art. */
export function BadgeGlitterLayer({
  glitter,
  displaySrc,
  motionSeed,
  frame,
  content,
}: BadgeGlitterLayerProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const { interactive } = getBadgeContentMode(content);
  const variant = resolveBadgeGlitterVariant(frame);
  const revealPulse =
    glitter === "impression"
      ? (interactive?.impressionGlitterRevealPulse ?? 0)
      : 0;

  const maskStyle = useMemo(
    () =>
      displaySrc
        ? badgeImageMaskStylePadded(displaySrc, 108)
        : paddedBadgeMaskStyle(circularBadgeMaskStyle(), 108),
    [displaySrc],
  );

  const particleCount = variant === "grid" ? 22 : 44;
  const particles = useMemo(
    () =>
      buildGlitterParticles(motionSeed, particleCount, revealPulse, {
        marginPct: 8,
        maxDriftPx: 9,
        ...(variant === "detail"
          ? { sizeMinPx: 3, sizeRangePx: 2.8 }
          : { sizeMinPx: 2, sizeRangePx: 2.2 }),
      }),
    [motionSeed, particleCount, revealPulse, variant],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (glitter === "none" || !displaySrc) {
    return null;
  }

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-[11%] overflow-hidden",
        variant === "grid" ? "z-[12]" : "z-[18]",
      )}
      style={maskStyle}
    >
      {particles.map((particle) => (
        <span
          key={`${revealPulse}-${particle.id}`}
          className={cn(
            "impression-glitter-particle absolute rounded-full will-change-transform",
            !reduceMotion && "impression-glitter-particle-flat",
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
              "--glitter-dz": "0px",
              "--glitter-delay": `${particle.delayMs}ms`,
              "--glitter-duration": `${particle.durationMs}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
