/**
 * Single switch for locked-badge “no” refuse choreography (shrink + shake).
 * `false` → presses still work (unlock hold / no-op); no motion.
 */
export const LOCKED_BADGE_REFUSE_MOTION_ENABLED = true;

export const LOCKED_BADGE_REFUSE_MS = 400;

export function isLockedBadgeRefuseMotionEnabled(): boolean {
  return LOCKED_BADGE_REFUSE_MOTION_ENABLED && !prefersReducedMotion();
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
