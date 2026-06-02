"use client";

import { useEffect, useMemo } from "react";

import type { AchievementUiStateActions } from "@/components/achievements/hooks/use-achievement-ui-state-machine";
import type { AchievementCollectionEntryViewModel } from "@/lib/achievements/data/achievement-view-models";

type UseAchievementDetailSelectionControllerArgs = {
  achievements: AchievementCollectionEntryViewModel[];
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
    return (
      achievements.find((entry) => entry.detail.id === detailAchievementId)?.detail ?? null
    );
  }, [achievements, detailAchievementId]);

  useEffect(() => {
    if (detailAchievementId && !detailAchievement) {
      uiActions.closeOverlay();
    }
  }, [detailAchievement, detailAchievementId, uiActions]);

  return { detailAchievement };
}
