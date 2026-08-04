import { prefersReducedMotion } from "@/lib/dom/prefers-reduced-motion";

export const UNLOCKED_BADGE_POKE_MOTION_ENABLED = true;

export const UNLOCKED_BADGE_POKE_MS = 1200;

export function isUnlockedBadgePokeMotionEnabled(): boolean {
  return UNLOCKED_BADGE_POKE_MOTION_ENABLED && !prefersReducedMotion();
}
