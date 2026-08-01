"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { getCachedBadgeMaskStyle } from "@/lib/achievements/badge/shared/render-cache";

type BadgeParallaxImpressionSheenProps = {
  src: string;
  motionSeed: string;
};

export function BadgeParallaxImpressionSheen({
  src,
  motionSeed,
}: BadgeParallaxImpressionSheenProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const maskStyle = useMemo(() => getCachedBadgeMaskStyle(src), [src]);
  const timing = useMemo(() => sheenTimingFromSeed(motionSeed), [motionSeed]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (reduceMotion) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        ...maskStyle,
        transform: "translateZ(1.2px)",
      }}
    >
      <div
        className="badge-impression-sheen"
        style={
          {
            "--badge-sheen-duration": `${timing.durationMs}ms`,
            "--badge-sheen-delay": `${timing.delayMs}ms`,
          } as CSSProperties
        }
      />
    </div>
  );
}

function sheenTimingFromSeed(seed: string): {
  durationMs: number;
  delayMs: number;
} {
  const hash = hashSeed(seed);
  return {
    durationMs: 12000 + (hash % 6000),
    delayMs: hash % 2500,
  };
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
