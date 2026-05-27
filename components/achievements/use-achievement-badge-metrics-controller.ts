"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBadgeDebugOverlayPreference } from "@/lib/badge/debug-overlay-preference";
import { hasAchievementModelGlbAsset } from "@/lib/achievements/badge-assets";
import { AchievementRecord } from "./achievement-transformers";

function tryGetHighResNow() {
  return typeof performance !== "undefined" && Number.isFinite(performance.now())
    ? performance.now()
    : Date.now();
}

/**
 * Feature-level controller for badge detail metrics:
 * - timing handlers/state for decode/visual readiness
 * - GLB-specific signed-URL and model-ready timings (N/A for image badges)
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
  const [detailOpenToModelUrlReadyMs, setDetailOpenToModelUrlReadyMs] = useState<number | null>(null);
  const [detailOpenToModelVisualReadyMs, setDetailOpenToModelVisualReadyMs] = useState<number | null>(
    null,
  );

  const detailIsModelBadge = useMemo(
    () =>
      hasAchievementModelGlbAsset(
        detailAchievement?.icon_asset_kind,
        detailAchievement?.icon_asset_path,
      ),
    [detailAchievement?.icon_asset_kind, detailAchievement?.icon_asset_path],
  );

  const markDetailOpenStart = useCallback((achievementId: string) => {
    detailOpenStartedAtRef.current = tryGetHighResNow();
    detailPerfMeasuredForIdRef.current = achievementId;
    detailImageDecodedMsRef.current = null;
    setDetailOpenToImageDecodedMs(null);
    setDetailOpenToVisualReadyMs(null);
    setDetailOpenToModelUrlReadyMs(null);
    setDetailOpenToModelVisualReadyMs(null);
  }, []);

  const elapsedSinceDetailOpen = useCallback(() => {
    if (detailOpenStartedAtRef.current == null) return null;
    return Math.max(0, Math.round(tryGetHighResNow() - detailOpenStartedAtRef.current));
  }, []);

  const handleDetailBadgeImageDecoded = useCallback(() => {
    if (!detailAchievement?.id) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
    if (detailOpenStartedAtRef.current == null) return;
    if (detailImageDecodedMsRef.current != null) return;

    const elapsed = elapsedSinceDetailOpen();
    if (elapsed == null) return;
    detailImageDecodedMsRef.current = elapsed;
    setDetailOpenToImageDecodedMs(elapsed);
  }, [detailAchievement?.id, elapsedSinceDetailOpen]);

  const handleDetailBadgeModelUrlReady = useCallback(() => {
    if (!detailIsModelBadge) return;
    if (!detailAchievement?.id) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
    if (detailOpenStartedAtRef.current == null) return;

    const elapsed = elapsedSinceDetailOpen();
    if (elapsed == null) return;
    setDetailOpenToModelUrlReadyMs(elapsed);
  }, [detailAchievement?.id, detailIsModelBadge, elapsedSinceDetailOpen]);

  const handleDetailBadgeVisualReady = useCallback(() => {
    if (!detailAchievement?.id) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
    if (detailOpenStartedAtRef.current == null) return;

    const elapsed = elapsedSinceDetailOpen();
    if (elapsed == null) return;

    if (detailIsModelBadge) {
      setDetailOpenToModelVisualReadyMs(elapsed);
    }
    setDetailOpenToVisualReadyMs(elapsed);
    detailPerfMeasuredForIdRef.current = null;
  }, [detailAchievement?.id, detailIsModelBadge, elapsedSinceDetailOpen]);

  useEffect(() => {
    if (!detailAchievement?.id) return;
    if (!detailAchievement.icon_url?.trim()) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;

    const timeout = window.setTimeout(() => {
      if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
      if (detailOpenStartedAtRef.current == null) return;

      const elapsed = elapsedSinceDetailOpen();
      if (elapsed == null) return;

      if (detailImageDecodedMsRef.current == null) {
        detailImageDecodedMsRef.current = elapsed;
        setDetailOpenToImageDecodedMs(elapsed);
      }
      if (detailIsModelBadge) {
        setDetailOpenToModelVisualReadyMs((current) => current ?? elapsed);
      }
      setDetailOpenToVisualReadyMs(elapsed);
      detailPerfMeasuredForIdRef.current = null;
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [
    detailAchievement?.icon_url,
    detailAchievement?.id,
    detailIsModelBadge,
    elapsedSinceDetailOpen,
  ]);

  const [badgeDebugOverlayPref] = useBadgeDebugOverlayPreference();
  const badgeDebugOverlay = isAdmin && badgeDebugOverlayPref;

  return {
    badgeDebugOverlay,
    detailIsModelBadge,
    markDetailOpenStart,
    handleDetailBadgeImageDecoded,
    handleDetailBadgeModelUrlReady,
    handleDetailBadgeVisualReady,
    detailOpenToVisualReadyMs,
    detailOpenToImageDecodedMs,
    detailOpenToModelUrlReadyMs,
    detailOpenToModelVisualReadyMs,
  };
}
