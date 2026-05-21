"use client";

import { useEffect } from "react";

import {
  hasBadgeDecodeCached,
  prewarmBadgeRenderCache,
} from "@/lib/badge/render-cache";
import { logImageKitEvent } from "@/lib/imagekit/telemetry";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";

type UseBadgeChunkedPrewarmArgs = {
  achievements: AchievementRecord[];
  pause: boolean;
};

/**
 * Opportunistically prewarms badge render caches while no modal overlay is open.
 */
export function useBadgeChunkedPrewarm({ achievements, pause }: UseBadgeChunkedPrewarmArgs) {
  useEffect(() => {
    if (achievements.length === 0) return;
    if (pause) return;

    const jobs: { src: string; id: string }[] = [];
    let skippedCached = 0;

    for (const achievement of achievements) {
      const rawSrc = achievement.icon_url?.trim() ?? "";
      if (!rawSrc) continue;
      const src = toOptimizedBadgeRenderSrc(rawSrc);
      if (hasBadgeDecodeCached(src)) {
        skippedCached += 1;
        continue;
      }
      jobs.push({ src, id: achievement.id });
    }

    const emitSummary = (scheduled: number, skippedHidden: number) => {
      if (scheduled === 0 && skippedCached === 0 && skippedHidden === 0) return;
      logImageKitEvent({
        op: "grid_prewarm",
        scheduled,
        skippedCached,
        skippedHidden,
      });
    };

    if (jobs.length === 0) {
      emitSummary(0, 0);
      return;
    }

    let cancelled = false;
    let index = 0;
    let rafId = 0;
    const CHUNK = 2;

    const pump = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;

      const end = Math.min(index + CHUNK, jobs.length);
      for (; index < end; index += 1) {
        const j = jobs[index];
        prewarmBadgeRenderCache(j.src, { motionSeed: j.id });
      }
      if (index < jobs.length) {
        rafId = requestAnimationFrame(pump);
      } else {
        emitSummary(jobs.length, 0);
      }
    };

    const startPump = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        emitSummary(0, jobs.length);
        return;
      }
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(pump);
      });
    };

    const onVisibility = () => {
      if (cancelled) return;
      if (document.hidden) return;
      if (index >= jobs.length) return;
      startPump();
    };

    if (typeof document !== "undefined" && document.hidden) {
      emitSummary(0, jobs.length);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        cancelled = true;
        document.removeEventListener("visibilitychange", onVisibility);
        cancelAnimationFrame(rafId);
      };
    }

    startPump();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(rafId);
    };
  }, [achievements, pause]);
}
