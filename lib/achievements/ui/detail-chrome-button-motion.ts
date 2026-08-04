/**
 * Single switch for detail/edit chrome icon enter & exit.
 * `false` → buttons still render and actions run immediately; no bubble motion.
 */
export const DETAIL_CHROME_BUTTON_MOTION_ENABLED = true;

export const DETAIL_CHROME_BUTTON_ENTER_MS = 780;

export const DETAIL_CHROME_BUTTON_EXIT_MS = 480;

export const DETAIL_CHROME_BUTTON_STAGGER_MS = 55;

export const DETAIL_CHROME_BUTTON_STAGGER_SPAN = 3;

export function detailChromeButtonExitTotalMs(): number {
  return (
    DETAIL_CHROME_BUTTON_EXIT_MS +
    DETAIL_CHROME_BUTTON_STAGGER_MS * DETAIL_CHROME_BUTTON_STAGGER_SPAN
  );
}

export function isDetailChromeButtonMotionEnabled(): boolean {
  return DETAIL_CHROME_BUTTON_MOTION_ENABLED && !prefersReducedMotion();
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
