"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDrag } from "@use-gesture/react";

import type { DetailBadgeGestureSurface } from "@/lib/achievements/ui/detail-badge-gesture-surface";
import {
  UNLOCKED_BADGE_POKE_MS,
  isUnlockedBadgePokeMotionEnabled,
} from "@/lib/achievements/ui/unlocked-badge-poke-motion";
import { cn } from "@/lib/utils";

const POKE_MOTION_CLASS = "badge-unlocked-poke-motion";

function isPokeArmed(surface: DetailBadgeGestureSurface): boolean {
  return (
    isUnlockedBadgePokeMotionEnabled() &&
    surface.detailMode === "view" &&
    surface.present &&
    !surface.locked &&
    !surface.unlocking
  );
}

/**
 * Presentation-only unlocked badge poke (scale dip/rise wave).
 * Feature gate + arming live inside the hook; tap → poke, drag left for spin.
 */
export function useUnlockedBadgePokeMotion(surface: DetailBadgeGestureSurface) {
  const armed = isPokeArmed(surface);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!armed) setPlaying(false);
  }, [armed]);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setPlaying(false), UNLOCKED_BADGE_POKE_MS);
    return () => window.clearTimeout(t);
  }, [playing]);

  const trigger = useCallback(() => {
    if (!armed) return;
    setPlaying(false);
    requestAnimationFrame(() => {
      setPlaying(true);
    });
  }, [armed]);

  const bind = useDrag(
    ({ tap }) => {
      if (tap) trigger();
    },
    {
      enabled: armed,
      filterTaps: true,
      threshold: 6,
      pointer: { capture: false },
      preventScroll: false,
    },
  );

  return useMemo(
    () => ({
      className: cn(armed && "touch-none", playing && POKE_MOTION_CLASS),
      bind,
    }),
    [armed, bind, playing],
  );
}
