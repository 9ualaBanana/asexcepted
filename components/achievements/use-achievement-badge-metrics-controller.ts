"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBadgeDebugOverlayPreference } from "@/lib/badge/debug-overlay-preference";
import { AchievementRecord } from "./achievement-transformers";

function tryGetHighResNow() {
  return typeof performance !== "undefined" && Number.isFinite(performance.now())
    ? performance.now()
    : Date.now();
}

/**
 * Feature-level controller for badge detail metrics:
 * - timing handlers/state for decode/visual readiness
 * - debug-overlay preference state
 */
export function useAchievementBadgeMetricsController(
  detailAchievement: AchievementRecord | null,
  isAdmin = false,
) {
  const detailOpenStartedAtRef = useRef<number | null>(null);
  const detailPerfMeasuredForIdRef = useRef<string | null>(null);
  const detailImageDecodedMsRef = useRef<number | null>(null);
  const [detailOpenToVisualReadyMs, setDetailOpenToVisualReadyMs] = useState<number | null>(null);
  const [detailOpenToImageDecodedMs, setDetailOpenToImageDecodedMs] = useState<number | null>(null);

  const markDetailOpenStart = useCallback((achievementId: string) => {
    detailOpenStartedAtRef.current = tryGetHighResNow();
    detailPerfMeasuredForIdRef.current = achievementId;
    detailImageDecodedMsRef.current = null;
    setDetailOpenToImageDecodedMs(null);
    setDetailOpenToVisualReadyMs(null);
  }, []);

  const handleDetailBadgeImageDecoded = useCallback(() => {
    if (!detailAchievement?.id) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
    if (detailOpenStartedAtRef.current == null) return;

    const elapsed = Math.max(0, Math.round(tryGetHighResNow() - detailOpenStartedAtRef.current));
    detailImageDecodedMsRef.current = elapsed;
    setDetailOpenToImageDecodedMs(elapsed);
  }, [detailAchievement?.id]);

  const handleDetailBadgeVisualReady = useCallback(() => {
    if (!detailAchievement?.id) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
    if (detailOpenStartedAtRef.current == null) return;

    const elapsed = Math.max(0, Math.round(tryGetHighResNow() - detailOpenStartedAtRef.current));
    setDetailOpenToVisualReadyMs(elapsed);
    detailPerfMeasuredForIdRef.current = null;
  }, [detailAchievement?.id]);

  useEffect(() => {
    if (!detailAchievement?.id) return;
    if (!detailAchievement.icon_url?.trim()) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;

    const timeout = window.setTimeout(() => {
      if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
      if (detailOpenStartedAtRef.current == null) return;

      const elapsed = Math.max(0, Math.round(tryGetHighResNow() - detailOpenStartedAtRef.current));
      if (detailImageDecodedMsRef.current == null) {
        detailImageDecodedMsRef.current = elapsed;
        setDetailOpenToImageDecodedMs(elapsed);
      }
      setDetailOpenToVisualReadyMs(elapsed);
      detailPerfMeasuredForIdRef.current = null;
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [detailAchievement?.icon_url, detailAchievement?.id]);

  const [badgeDebugOverlayPref] = useBadgeDebugOverlayPreference();
  const badgeDebugOverlay = isAdmin && badgeDebugOverlayPref;

  return {
    badgeDebugOverlay,
    markDetailOpenStart,
    handleDetailBadgeImageDecoded,
    handleDetailBadgeVisualReady,
    detailOpenToVisualReadyMs,
    detailOpenToImageDecodedMs,
  };
}
