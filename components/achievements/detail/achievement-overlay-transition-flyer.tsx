"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  OVERLAY_FADE_MS,
  OVERLAY_ZOOM_MS,
  cloneBadgeContainerVisual,
  getBadgeTransitionSource,
  prefersReducedMotion,
  toDomRectLite,
  type OverlayTransitionSession,
} from "@/lib/achievements/ui/overlay-transition";

type AchievementOverlayTransitionFlyerProps = {
  session: OverlayTransitionSession;
  badgeContainerRef: RefObject<HTMLDivElement | null>;
};

type FlyerPose = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
};

export function AchievementOverlayTransitionFlyer({
  session,
  badgeContainerRef,
}: AchievementOverlayTransitionFlyerProps) {
  const { phase, motion, originRect, onSettledOpen, onSettledClose } = session;
  const [pose, setPose] = useState<FlyerPose | null>(null);
  const [visible, setVisible] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(false);
  const cloneHostRef = useRef<HTMLDivElement | null>(null);
  const pendingCloneRef = useRef<HTMLElement | null>(null);
  const pendingToPoseRef = useRef<FlyerPose | null>(null);
  const settledRef = useRef(false);
  const activePhaseRef = useRef<"opening" | "closing" | null>(null);

  useEffect(() => {
    if (phase === "open" || phase == null) {
      setVisible(false);
      setPose(null);
      setTransitionEnabled(false);
      settledRef.current = false;
      activePhaseRef.current = null;
      pendingCloneRef.current = null;
      pendingToPoseRef.current = null;
      if (cloneHostRef.current) {
        cloneHostRef.current.replaceChildren();
      }
    }
  }, [phase]);

  useLayoutEffect(() => {
    if (!visible || !pose || !pendingCloneRef.current || !cloneHostRef.current) {
      return;
    }
    cloneHostRef.current.replaceChildren(pendingCloneRef.current);
    pendingCloneRef.current = null;

    const toPose = pendingToPoseRef.current;
    pendingToPoseRef.current = null;
    if (!toPose) return;

    const raf = requestAnimationFrame(() => {
      setTransitionEnabled(true);
      setPose(toPose);
    });
    return () => cancelAnimationFrame(raf);
  }, [pose, visible]);

  useEffect(() => {
    if (phase !== "opening" && phase !== "closing") return;

    if (motion === "fade" || !originRect || prefersReducedMotion()) {
      settledRef.current = true;
      if (phase === "opening") onSettledOpen();
      else {
        const t = window.setTimeout(() => onSettledClose(), OVERLAY_FADE_MS);
        return () => window.clearTimeout(t);
      }
      return;
    }

    let cancelled = false;
    let zoomTimeout: number | undefined;
    let startDelay: number | undefined;

    const settle = (direction: "opening" | "closing") => {
      if (cancelled || settledRef.current) return;
      settledRef.current = true;
      if (direction === "opening") onSettledOpen();
      else onSettledClose();
    };

    const runZoom = (direction: "opening" | "closing") => {
      const targetEl = badgeContainerRef.current;
      const sourceEl =
        direction === "opening"
          ? getBadgeTransitionSource()
          : (targetEl ?? getBadgeTransitionSource());

      if (!targetEl || !sourceEl || cancelled) {
        settle(direction);
        return;
      }

      const target = toDomRectLite(targetEl.getBoundingClientRect());
      if (target.width < 1 || target.height < 1) {
        settle(direction);
        return;
      }

      const from = direction === "opening" ? originRect : target;
      const to = direction === "opening" ? target : originRect;

      settledRef.current = false;
      activePhaseRef.current = direction;
      pendingCloneRef.current = cloneBadgeContainerVisual(sourceEl);
      pendingToPoseRef.current = {
        x: to.x,
        y: to.y,
        scaleX: to.width / from.width,
        scaleY: to.height / from.height,
        width: from.width,
        height: from.height,
      };
      setTransitionEnabled(false);
      setVisible(true);
      setPose({
        x: from.x,
        y: from.y,
        scaleX: 1,
        scaleY: 1,
        width: from.width,
        height: from.height,
      });

      zoomTimeout = window.setTimeout(() => {
        settle(direction);
      }, OVERLAY_ZOOM_MS + 40);
    };

    startDelay = window.setTimeout(() => {
      if (!cancelled) runZoom(phase);
    }, 0);

    return () => {
      cancelled = true;
      if (startDelay) window.clearTimeout(startDelay);
      if (zoomTimeout) window.clearTimeout(zoomTimeout);
    };
  }, [
    badgeContainerRef,
    motion,
    onSettledClose,
    onSettledOpen,
    originRect,
    phase,
  ]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[220] overflow-hidden"
      style={{
        left: 0,
        top: 0,
        width: pose?.width ?? 0,
        height: pose?.height ?? 0,
        transform: pose
          ? `translate(${pose.x}px, ${pose.y}px) scale(${pose.scaleX}, ${pose.scaleY})`
          : undefined,
        transformOrigin: "top left",
        transition: transitionEnabled
          ? `transform ${OVERLAY_ZOOM_MS}ms ease-out`
          : "none",
        visibility: visible && pose ? "visible" : "hidden",
      }}
      onTransitionEnd={(event) => {
        if (event.propertyName !== "transform") return;
        if (settledRef.current) return;
        settledRef.current = true;
        if (activePhaseRef.current === "opening") onSettledOpen();
        else if (activePhaseRef.current === "closing") onSettledClose();
      }}
    >
      <div ref={cloneHostRef} className="h-full w-full" />
    </div>
  );
}
