"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { DetailBadgeGestureSurface } from "@/lib/achievements/ui/detail-badge-gesture-surface";
import {
  UNLOCKED_BADGE_POKE_MS,
  isUnlockedBadgePokeMotionEnabled,
} from "@/lib/achievements/ui/unlocked-badge-poke-motion";

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

  return useMemo(
    () => ({
      trigger,
      className: playing ? POKE_MOTION_CLASS : undefined,
      armed,
    }),
    [armed, playing, trigger],
  );
}
