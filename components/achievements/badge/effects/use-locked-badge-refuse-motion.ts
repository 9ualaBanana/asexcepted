"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { DetailBadgeGestureSurface } from "@/lib/achievements/ui/detail-badge-gesture-surface";
import {
  LOCKED_BADGE_REFUSE_MS,
  isLockedBadgeRefuseMotionEnabled,
} from "@/lib/achievements/ui/locked-badge-refuse-motion";

const REFUSE_MOTION_CLASS = "badge-locked-refuse-motion";

function isRefuseArmed(surface: DetailBadgeGestureSurface): boolean {
  return (
    isLockedBadgeRefuseMotionEnabled() &&
    surface.detailMode === "view" &&
    surface.present &&
    surface.locked &&
    !surface.unlocking
  );
}

/**
 * Presentation-only locked badge refuse gesture.
 * Feature gate + arming live inside the hook.
 */
export function useLockedBadgeRefuseMotion(surface: DetailBadgeGestureSurface) {
  const armed = isRefuseArmed(surface);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!armed) setPlaying(false);
  }, [armed]);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setPlaying(false), LOCKED_BADGE_REFUSE_MS);
    return () => window.clearTimeout(t);
  }, [playing]);

  const trigger = useCallback(() => {
    if (!armed) return;
    setPlaying(false);
    requestAnimationFrame(() => {
      setPlaying(true);
    });
  }, [armed]);

  return useMemo(
    () => ({
      trigger,
      className: playing ? REFUSE_MOTION_CLASS : undefined,
      showHitLayer: armed && surface.readOnly,
      armed,
    }),
    [armed, playing, surface.readOnly, trigger],
  );
}
