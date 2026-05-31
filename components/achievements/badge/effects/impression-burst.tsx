"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

type PopKind = "star" | "bolt";

type PopSpec = {
  angle: number;
  dist: number;
  peak: number;
  delay: number;
  kind: PopKind;
  color: "yellow" | "magenta" | "cyan" | "orange";
};

/** 0–1 fraction of splash radius (not CSS % — translate % is relative to element size). */
const POP_TEMPLATE: PopSpec[] = [
  { angle: -72, dist: 0.92, peak: 1.45, delay: 0, kind: "star", color: "yellow" },
  { angle: -38, dist: 0.78, peak: 1.3, delay: 28, kind: "bolt", color: "magenta" },
  { angle: -8, dist: 1, peak: 1.5, delay: 10, kind: "star", color: "cyan" },
  { angle: 32, dist: 0.85, peak: 1.35, delay: 44, kind: "bolt", color: "orange" },
  { angle: 72, dist: 0.95, peak: 1.4, delay: 18, kind: "star", color: "magenta" },
  { angle: 112, dist: 0.72, peak: 1.25, delay: 52, kind: "bolt", color: "yellow" },
  { angle: 152, dist: 0.88, peak: 1.42, delay: 6, kind: "star", color: "orange" },
  { angle: -152, dist: 0.8, peak: 1.28, delay: 36, kind: "bolt", color: "cyan" },
  { angle: -108, dist: 0.98, peak: 1.38, delay: 22, kind: "star", color: "yellow" },
  { angle: 168, dist: 0.68, peak: 1.22, delay: 40, kind: "bolt", color: "magenta" },
];

const popFill: Record<PopSpec["color"], string> = {
  yellow: "bg-amber-300",
  magenta: "bg-fuchsia-400",
  cyan: "bg-cyan-300",
  orange: "bg-orange-400",
};

function jitterPops(pulse: number): PopSpec[] {
  const seed = pulse * 2654435761;
  return POP_TEMPLATE.map((pop, index) => ({
    ...pop,
    angle: pop.angle + ((seed + index * 97) % 37) - 18,
    dist: Math.min(1.08, Math.max(0.58, pop.dist + ((seed + index * 53) % 20) / 100 - 0.08)),
    delay: pop.delay + ((seed + index * 31) % 28),
  }));
}

/** Badge-relative splash radius (detail slot ~15–20rem wide). */
const SPLASH_RADIUS_REM = 10.5;

function popMotionVars(angleDeg: number, distNorm: number, peak: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const reach = distNorm * SPLASH_RADIUS_REM;
  const tx = Math.sin(rad) * reach;
  const ty = -Math.cos(rad) * reach;
  const mid = 0.42;
  return {
    "--tx": `${tx}rem`,
    "--ty": `${ty}rem`,
    "--tx-mid": `${tx * mid}rem`,
    "--ty-mid": `${ty * mid}rem`,
    "--peak-scale": String(peak),
    "--pop-rot": `${angleDeg * 0.35}deg`,
  } as CSSProperties;
}

type ImpressionBurstProps = {
  pulse: number;
  className?: string;
};

export function ImpressionBurst({ pulse, className }: ImpressionBurstProps) {
  const [active, setActive] = useState(false);
  const pops = useMemo(() => jitterPops(pulse), [pulse]);

  useEffect(() => {
    if (pulse <= 0) return;
    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 920);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-visible",
        className,
      )}
    >
      <div className="relative h-[118%] w-[118%] max-h-none max-w-none">
        <div className="impression-wow-flash absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full" />

        <span
          className="impression-wow-stamp absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-black italic leading-none tracking-tighter text-amber-300"
          style={{
            fontSize: "clamp(2.75rem, 22vw, 4.25rem)",
            WebkitTextStroke: "2.5px #0a0a0a",
            paintOrder: "stroke fill",
            textShadow:
              "3px 3px 0 #0a0a0a, -1px -1px 0 rgba(255,255,255,0.35)",
          }}
        >
          WOW
        </span>

        {pops.map((pop, index) => {
          const style = popMotionVars(pop.angle, pop.dist, pop.peak);
          return (
            <span
              key={`${pulse}-${index}`}
              className={cn(
                "impression-comic-pop absolute left-1/2 top-1/2 block origin-center",
                pop.kind === "star"
                  ? "impression-comic-star h-5 w-5"
                  : "h-2.5 w-9 rounded-[2px]",
                popFill[pop.color],
                "outline outline-2 outline-black/80",
              )}
              style={{
                ...style,
                animationDelay: `${pop.delay}ms`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
