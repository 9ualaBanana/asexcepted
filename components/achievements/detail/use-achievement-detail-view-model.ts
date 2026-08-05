"use client";

import { useEffect, useMemo } from "react";

import { iconMap } from "@/components/achievements/achievement-editor-shared";
import type { AchievementDetailViewModel } from "@/lib/achievements/presentation/collection-view-models";
import {
  DEFAULT_ACHIEVEMENT_ICON_KEY,
  DEFAULT_ACHIEVEMENT_TONE,
} from "@/lib/achievements/domain/enums";
import { prewarmBadgeRenderCache } from "@/lib/achievements/badge/shared/render-cache";
import { getAlphaMaskStyle } from "@/lib/achievements/badge/parallax/shape-utils";

type UseAchievementDetailViewModelArgs = {
  detailAchievement: AchievementDetailViewModel | null;
  detailRenderSrc: string | null;
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
  const DetailFallbackIcon =
    iconMap[detailAchievement?.icon ?? DEFAULT_ACHIEVEMENT_ICON_KEY];
  const detailTone = detailAchievement?.tone ?? DEFAULT_ACHIEVEMENT_TONE;
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
