"use client";

import { useEffect } from "react";

import { prewarmBadgeRenderCache } from "@/lib/badge/render-cache";
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
    for (const achievement of achievements) {
      const rawSrc = achievement.icon_url?.trim() ?? "";
      if (!rawSrc) continue;
      jobs.push({ src: toOptimizedBadgeRenderSrc(rawSrc), id: achievement.id });
    }
    if (jobs.length === 0) return;

    let cancelled = false;
    let index = 0;
    let rafId = 0;
    const CHUNK = 2;

    const pump = () => {
      if (cancelled) return;
      const end = Math.min(index + CHUNK, jobs.length);
      for (; index < end; index += 1) {
        const j = jobs[index];
        prewarmBadgeRenderCache(j.src, { motionSeed: j.id });
      }
      if (index < jobs.length) {
        rafId = requestAnimationFrame(pump);
      }
    };

    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(pump);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [achievements, pause]);
}
