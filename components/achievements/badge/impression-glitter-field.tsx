"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { IMPRESSION_GLITTER_UI_ENABLED } from "@/lib/achievements/impression-glitter-feature";
import { buildGlitterParticles } from "@/lib/achievements/glitter-particles";
import { cn } from "@/lib/utils";

type ImpressionGlitterFieldProps = {
  active: boolean;
  motionSeed: string;
  maskStyle: CSSProperties;
  /** Increment to replay the “emerge from behind” entrance. */
  revealPulse?: number;
  variant?: "detail" | "grid";
  className?: string;
};

const paletteClass: Record<
  ReturnType<typeof buildGlitterParticles>[number]["palette"],
  string
> = {
  gold: "bg-amber-200/90 shadow-[0_0_6px_rgba(252,211,77,0.75)]",
  champagne: "bg-yellow-100/85 shadow-[0_0_5px_rgba(254,240,138,0.65)]",
  cream: "bg-orange-50/90 shadow-[0_0_5px_rgba(255,247,237,0.7)]",
  rose: "bg-rose-200/80 shadow-[0_0_6px_rgba(251,207,232,0.65)]",
};

export function ImpressionGlitterField({
  active,
  motionSeed,
  maskStyle,
  revealPulse = 0,
  variant = "detail",
  className,
}: ImpressionGlitterFieldProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const particleCount = variant === "grid" ? 14 : 32;
  const particles = useMemo(
    () => buildGlitterParticles(motionSeed, particleCount, revealPulse),
    [motionSeed, particleCount, revealPulse],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!active || revealPulse <= 0 || reduceMotion) {
      setRevealing(false);
      return;
    }
    setRevealing(true);
    const timer = window.setTimeout(() => setRevealing(false), 1100);
    return () => window.clearTimeout(timer);
  }, [active, revealPulse, reduceMotion]);

  if (!IMPRESSION_GLITTER_UI_ENABLED || !active) return null;

  if (reduceMotion) {
    return (
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-[10%] rounded-full",
          "bg-[radial-gradient(ellipse_at_50%_48%,rgba(252,211,77,0.22)_0%,rgba(251,191,36,0.08)_42%,transparent_68%)]",
          className,
        )}
        style={maskStyle}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-[16%] overflow-visible",
        variant === "detail" && "impression-glitter-3d",
        revealing && "impression-glitter-revealing",
        className,
      )}
      style={maskStyle}
    >
      <div
        className={cn(
          "absolute inset-0",
          "bg-[radial-gradient(ellipse_at_50%_52%,rgba(255,237,180,0.14)_0%,rgba(251,191,36,0.06)_38%,transparent_72%)]",
        )}
      />
      {particles.map((particle) => (
        <span
          key={`${revealPulse}-${particle.id}`}
          className={cn(
            "impression-glitter-particle absolute rounded-full will-change-transform",
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
              "--glitter-dz": `${particle.driftZ}px`,
              "--glitter-delay": `${particle.delayMs}ms`,
              "--glitter-duration": `${particle.durationMs}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
