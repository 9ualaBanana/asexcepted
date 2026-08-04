import { prefersReducedMotion } from "@/lib/dom/prefers-reduced-motion";

export const LOCKED_BADGE_REFUSE_MOTION_ENABLED = true;

export const LOCKED_BADGE_REFUSE_MS = 400;

export function isLockedBadgeRefuseMotionEnabled(): boolean {
  return LOCKED_BADGE_REFUSE_MOTION_ENABLED && !prefersReducedMotion();
}
