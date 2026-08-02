/**
 * Single switch for unlocked-badge water-poke choreography.
 * `false` → presses still work (spin / impressions); no poke motion.
 */
export const UNLOCKED_BADGE_POKE_MOTION_ENABLED = true;

export const UNLOCKED_BADGE_POKE_MS = 1200;

export function isUnlockedBadgePokeMotionEnabled(): boolean {
  return UNLOCKED_BADGE_POKE_MOTION_ENABLED && !prefersReducedMotion();
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
