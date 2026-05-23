import type { CSSProperties } from "react";

import { getCachedBadgeMaskStyle } from "@/lib/badge/render-cache";

export function badgeImageMaskStyle(renderSrc: string): CSSProperties {
  return getCachedBadgeMaskStyle(renderSrc);
}

/** Fallback / icon-only badges use a soft circular silhouette. */
export function circularBadgeMaskStyle(): CSSProperties {
  const gradient = "radial-gradient(circle at 50% 48%, black 56%, transparent 62%)";
  return {
    WebkitMaskImage: gradient,
    maskImage: gradient,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
}
