import type { CSSProperties } from "react";

function hashSeed(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic CSS variables for `.achievement-badge-object-float` (globals.css). */
export function makeBadgeMotionStyle(seed: string, startCentered = false): CSSProperties {
  const h = hashSeed(seed);
  const pick = (offset: number) => ((h >>> offset) & 255) / 255;
  const floatDuration = 5.2 + pick(0) * 1.9;
  const shadowDuration = floatDuration * (0.97 + pick(8) * 0.06);
  const delay = startCentered ? 0 : -(pick(16) * floatDuration);
  const dx = 0.38 + pick(12) * 0.65;
  const dx2 = 0.14 + pick(6) * 0.25;
  const up = 1.55 + pick(20) * 1.35;
  const up2 = 0.26 + pick(10) * 0.44;
  const rot = 0.16 + pick(24) * 0.22;

  return {
    ["--badge-float-duration" as string]: `${floatDuration.toFixed(2)}s`,
    ["--badge-shadow-duration" as string]: `${shadowDuration.toFixed(2)}s`,
    ["--badge-float-delay" as string]: `${delay.toFixed(2)}s`,
    ["--badge-shadow-delay" as string]: `${(delay * 0.82).toFixed(2)}s`,
    ["--badge-float-dx" as string]: `${dx.toFixed(2)}px`,
    ["--badge-float-up" as string]: `${up.toFixed(2)}px`,
    ["--badge-float-dx2" as string]: `${dx2.toFixed(2)}px`,
    ["--badge-float-up2" as string]: `${up2.toFixed(2)}px`,
    ["--badge-float-rot" as string]: `${rot.toFixed(2)}deg`,
  };
}
