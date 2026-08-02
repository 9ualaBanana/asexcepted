import type { RefObject } from "react";

export type DomRectLite = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OverlayPhase = "opening" | "open" | "closing";

export type OverlayTransitionMotion = "zoom" | "fade";

/** Snapshot of the grid→overlay transition owned by the UI state machine. */
export type OverlayTransitionState = {
  phase: OverlayPhase | null;
  motion: OverlayTransitionMotion;
  originRect: DomRectLite | null;
};

/** Transition state + settle callbacks for the presentation layer. */
export type OverlayTransitionSession = OverlayTransitionState & {
  onSettledOpen: () => void;
  onSettledClose: () => void;
};

/** Binding for the live overlay badge container during the transition. */
export type OverlayBadgeHostBinding = {
  containerRef: RefObject<HTMLDivElement | null>;
  hideBadge: boolean;
};

/**
 * Single switch for zoom/fade choreography.
 * `false` → portal still opens/closes; no flyer, no staged phases, no chrome fade.
 */
export const OVERLAY_TRANSITION_MOTION_ENABLED = true;

export const OVERLAY_ZOOM_MS = 300;
export const OVERLAY_FADE_MS = 140;

const BADGE_CONTAINER_ATTR = "data-badge-container";
const TRANSITION_SOURCE_ATTR = "data-badge-transition-source";

export function isOverlayTransitionMotionEnabled(): boolean {
  return OVERLAY_TRANSITION_MOTION_ENABLED;
}

export function toDomRectLite(rect: DOMRectReadOnly): DomRectLite {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

/** Grid badge container box from a cell click (not the whole title cell). */
export function originRectFromClick(
  event: { currentTarget: EventTarget | null },
): DomRectLite | null {
  if (!isOverlayTransitionMotionEnabled()) return null;
  const root = event.currentTarget;
  if (!(root instanceof HTMLElement)) return null;
  const badge =
    root.querySelector<HTMLElement>(`[${BADGE_CONTAINER_ATTR}]`) ?? root;
  const rect = toDomRectLite(badge.getBoundingClientRect());
  if (rect.width < 1 || rect.height < 1) return null;
  markBadgeTransitionSource(badge);
  return rect;
}

export function markBadgeTransitionSource(el: HTMLElement): void {
  clearBadgeTransitionSource();
  el.setAttribute(TRANSITION_SOURCE_ATTR, "");
}

export function clearBadgeTransitionSource(): void {
  document
    .querySelectorAll(`[${TRANSITION_SOURCE_ATTR}]`)
    .forEach((node) => node.removeAttribute(TRANSITION_SOURCE_ATTR));
}

export function getBadgeTransitionSource(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${TRANSITION_SOURCE_ATTR}]`);
}

export function overlayMotionFromOrigin(
  originRect: DomRectLite | null,
): OverlayTransitionMotion {
  if (!isOverlayTransitionMotionEnabled()) return "fade";
  return originRect != null ? "zoom" : "fade";
}

export function portalDurationMsForMotion(
  motion: OverlayTransitionMotion,
): number {
  if (!isOverlayTransitionMotionEnabled()) return 0;
  return motion === "zoom" ? OVERLAY_ZOOM_MS : OVERLAY_FADE_MS;
}

export function shouldHideLiveBadgeDuringTransition(
  state: Pick<OverlayTransitionState, "phase" | "motion">,
): boolean {
  if (!isOverlayTransitionMotionEnabled()) return false;
  return (
    state.motion === "zoom" &&
    (state.phase === "opening" || state.phase === "closing")
  );
}

/** Visual stand-in of a badge container (contents included; canvas pixels copied when possible). */
export function cloneBadgeContainerVisual(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute(TRANSITION_SOURCE_ATTR);
  clone.removeAttribute(BADGE_CONTAINER_ATTR);
  clone.style.width = "100%";
  clone.style.height = "100%";
  clone.style.maxWidth = "none";
  clone.style.maxHeight = "none";
  clone.style.margin = "0";
  clone.style.opacity = "1";
  clone.style.pointerEvents = "none";
  copyCanvasPixels(source, clone);
  return clone;
}

function copyCanvasPixels(source: HTMLElement, clone: HTMLElement): void {
  const srcCanvases = source.querySelectorAll("canvas");
  const dstCanvases = clone.querySelectorAll("canvas");
  srcCanvases.forEach((src, index) => {
    const dst = dstCanvases[index];
    if (!(src instanceof HTMLCanvasElement) || !(dst instanceof HTMLCanvasElement)) {
      return;
    }
    dst.width = src.width;
    dst.height = src.height;
    try {
      const ctx = dst.getContext("2d");
      ctx?.drawImage(src, 0, 0);
    } catch {
      /* WebGL / tainted canvas — leave empty */
    }
  });
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
