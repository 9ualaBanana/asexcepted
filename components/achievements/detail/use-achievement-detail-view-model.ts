"use client";

import { useEffect, useMemo } from "react";

import { resolveTone } from "@/components/achievements/achievement-manager-utils";
import { getSafeIcon } from "@/components/achievements/achievement-editor-shared";
import type { AchievementRecord } from "@/lib/achievements/data/achievement-transformers";
import { prewarmBadgeRenderCache } from "@/lib/badge/render-cache";
import { getAlphaMaskStyle } from "@/lib/badge/shape-utils";

type UseAchievementDetailViewModelArgs = {
  detailAchievement: AchievementRecord | null;
  detailRenderSrc: string;
  optimisticUnlockedAchievementId: string | null;
  detailIsLockedUi: boolean;
  readOnly: boolean;
};

export function useAchievementDetailViewModel({
  detailAchievement,
  detailRenderSrc,
  optimisticUnlockedAchievementId,
  detailIsLockedUi,
  readOnly,
}: UseAchievementDetailViewModelArgs) {
  const DetailFallbackIcon = getSafeIcon(detailAchievement?.icon);
  const detailTone = useMemo(() => resolveTone(detailAchievement), [detailAchievement]);
  const detailMaskStyle = useMemo(
    () => (detailRenderSrc ? getAlphaMaskStyle(detailRenderSrc) : null),
    [detailRenderSrc],
  );

  useEffect(() => {
    const src = detailRenderSrc;
    if (!src) return;
    prewarmBadgeRenderCache(src, {
      motionSeed: detailAchievement?.id ?? "detail-default",
      startCentered: optimisticUnlockedAchievementId === detailAchievement?.id,
      includeAlphaMaskData: !readOnly && detailIsLockedUi,
    });
  }, [
    detailRenderSrc,
    detailAchievement?.id,
    detailIsLockedUi,
    optimisticUnlockedAchievementId,
    readOnly,
  ]);

  return {
    DetailFallbackIcon,
    detailTone,
    detailRenderSrc,
    detailMaskStyle,
  };
}
