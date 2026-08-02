"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  isOverlayTransitionMotionEnabled,
  portalDurationMsForMotion,
  shouldHideLiveBadgeDuringTransition,
  type OverlayBadgeHostBinding,
  type OverlayTransitionSession,
} from "@/lib/achievements/ui/overlay-transition";

/**
 * Presentation for grid→overlay motion (flyer, chrome fade, live-badge hide).
 * When motion is disabled, returns a no-op chrome binding and no flyer.
 */
export function useOverlayTransitionPresentation(
  session: OverlayTransitionSession,
) {
  const motionEnabled = isOverlayTransitionMotionEnabled();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideBadge = shouldHideLiveBadgeDuringTransition(session);
  const durationMs = portalDurationMsForMotion(session.motion);
  const [chromeOpaque, setChromeOpaque] = useState(
    () => !motionEnabled && session.phase === "open",
  );

  useEffect(() => {
    if (!motionEnabled) {
      setChromeOpaque(session.phase === "open");
      return;
    }
    if (session.phase === "closing" || session.phase == null) {
      setChromeOpaque(false);
      return;
    }
    if (session.phase === "open") {
      setChromeOpaque(true);
      return;
    }
    let rafInner = 0;
    const rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(() => {
        setChromeOpaque(true);
      });
    });
    return () => {
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
    };
  }, [motionEnabled, session.phase]);

  const badgeHost: OverlayBadgeHostBinding = useMemo(
    () => ({
      containerRef,
      hideBadge,
    }),
    [hideBadge],
  );

  return {
    badgeHost,
    chrome: {
      opaque: chromeOpaque,
      durationMs,
    },
    flyer: motionEnabled
      ? {
          session,
          badgeContainerRef: containerRef,
        }
      : null,
    isInteractive: session.phase === "open",
  };
}
