"use client";

import { useEffect, useMemo } from "react";

import { resolveTone } from "@/components/achievements/achievement-manager-utils";
import { getSafeIcon } from "@/components/achievements/achievement-editor-shared";
import type { AchievementDetailViewModel } from "@/lib/achievements/data/achievement-view-models";
import { prewarmBadgeRenderCache } from "@/lib/achievements/badge/shared/render-cache";
import { getAlphaMaskStyle } from "@/lib/achievements/badge/parallax/shape-utils";

type UseAchievementDetailViewModelArgs = {
  detailAchievement: AchievementDetailViewModel | null;
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
  const DetailFallbackIcon = detailAchievement?.FallbackIcon ?? getSafeIcon("trophy");
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
