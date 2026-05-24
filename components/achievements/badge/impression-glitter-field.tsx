"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { buildGlitterParticles } from "@/lib/achievements/glitter-particles";
import { cn } from "@/lib/utils";

type ImpressionGlitterFieldProps = {
  active: boolean;
  motionSeed: string;
  maskStyle: CSSProperties;
  revealPulse?: number;
  variant?: "detail" | "grid";
  /** Flat layer on top of badge art (grid, locked detail). */
  overlay?: boolean;
  className?: string;
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

export function ImpressionGlitterField({
  active,
  motionSeed,
  maskStyle,
  revealPulse = 0,
  variant = "detail",
  overlay = false,
  className,
}: ImpressionGlitterFieldProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const spinsWithBadge = variant === "detail" && !overlay;

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

  if (!active) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-[11%] overflow-hidden",
        spinsWithBadge && "impression-glitter-3d",
        className,
      )}
      style={maskStyle}
    >
      {particles.map((particle) => (
        <span
          key={`${revealPulse}-${particle.id}`}
          className={cn(
            "impression-glitter-particle absolute rounded-full will-change-transform",
            !reduceMotion &&
              (spinsWithBadge
                ? undefined
                : "impression-glitter-particle-flat"),
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
              "--glitter-dz": spinsWithBadge ? `${particle.driftZ}px` : "0px",
              "--glitter-delay": `${particle.delayMs}ms`,
              "--glitter-duration": `${particle.durationMs}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
