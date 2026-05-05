"use client";

import { useEffect, useMemo } from "react";

import type { AchievementUiStateActions } from "@/components/achievements/use-achievement-ui-state-machine";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";

type UseAchievementDetailSelectionControllerArgs = {
  achievements: AchievementRecord[];
  detailAchievementId: string | null;
  uiActions: AchievementUiStateActions;
};

/**
 * Resolves selected detail achievement and auto-closes stale selections.
 */
export function useAchievementDetailSelectionController({
  achievements,
  detailAchievementId,
  uiActions,
}: UseAchievementDetailSelectionControllerArgs) {
  const detailAchievement = useMemo(() => {
    if (!detailAchievementId) return null;
    return achievements.find((achievement) => achievement.id === detailAchievementId) ?? null;
  }, [achievements, detailAchievementId]);

  useEffect(() => {
    if (detailAchievementId && !detailAchievement) {
      uiActions.closeOverlay();
    }
  }, [detailAchievement, detailAchievementId, uiActions]);

  return { detailAchievement };
}
