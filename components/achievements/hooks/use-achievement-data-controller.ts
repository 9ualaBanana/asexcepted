"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { deleteAchievement } from "@/lib/achievements/application/achievements";
import { listCollection } from "@/lib/achievements/application/collection";
import type { BadgeSessionController } from "@/components/achievements/badge/upload/use-badge-session-controller";
import type { AchievementUiStateActions } from "@/components/achievements/hooks/use-achievement-ui-state-machine";
import type { AchievementCollectionEntryViewModel } from "@/lib/achievements/presentation/collection-view-models";
import { clearBadgeRenderCacheForSrc } from "@/lib/achievements/badge/shared/render-cache";
import { useUserAchievementsLiveUpdates } from "@/lib/live-updates";

type UseAchievementDataControllerArgs = {
  userId: string;
  readOnly: boolean;
  achievements: AchievementCollectionEntryViewModel[];
  detailAchievementId: string | null;
  setAchievements: (
    value:
      | AchievementCollectionEntryViewModel[]
      | ((
          prev: AchievementCollectionEntryViewModel[],
        ) => AchievementCollectionEntryViewModel[]),
  ) => void;
  setError: (value: string | null) => void;
  setIsSaving: (value: boolean) => void;
  badgeSessionController: BadgeSessionController;
  uiActions: AchievementUiStateActions;
};

export type AchievementDataControllerActions = {
  loadAchievements: (opts?: {
    silent?: boolean;
  }) => Promise<AchievementCollectionEntryViewModel[] | null>;
  deleteAchievementById: (id: string) => Promise<void>;
};

export function useAchievementDataController({
  userId,
  readOnly,
  achievements,
  detailAchievementId,
  setAchievements,
  setError,
  setIsSaving,
  badgeSessionController,
  uiActions,
}: UseAchievementDataControllerArgs) {
  const [isLoading, setIsLoading] = useState(true);

  const loadAchievements = useCallback(
    async (opts?: { silent?: boolean }): Promise<AchievementCollectionEntryViewModel[] | null> => {
      const silent = opts?.silent ?? false;
      if (!silent) setIsLoading(true);
      if (!silent) setError(null);

      const result = await listCollection(userId);
      if (result.isErr()) {
        setError(result.error);
        if (!silent) setAchievements([]);
        if (!silent) setIsLoading(false);
        return null;
      }

      setAchievements(result.value);
      if (!silent) setIsLoading(false);
      return result.value;
    },
    [setAchievements, setError, userId],
  );

  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadAchievements({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [loadAchievements]);

  useUserAchievementsLiveUpdates({
    enabled: readOnly,
    profileUserId: userId,
    onInvalidate: () => {
      void loadAchievements({ silent: true });
    },
  });

  const deleteAchievementById = useCallback(
    async (id: string) => {
      if (readOnly) return;

      setIsSaving(true);
      setError(null);

      const target = achievements.find((entry) => entry.detail.id === id);
      const targetRenderSrc = target?.detail.renderSrc;

      const deleteResult = await deleteAchievement(id);
      if (deleteResult.isErr()) {
        setError(deleteResult.error);
        setIsSaving(false);
        return;
      }

      await badgeSessionController.deleteRemoteFilesForAchievement(
        target?.detail,
        id,
        detailAchievementId,
      );

      setAchievements((prev) => prev.filter((entry) => entry.detail.id !== id));
      if (targetRenderSrc) {
        clearBadgeRenderCacheForSrc(targetRenderSrc);
      }
      if (detailAchievementId === id) {
        uiActions.closeOverlay();
      }
      uiActions.clearDelete();
      setIsSaving(false);
    },
    [
      achievements,
      badgeSessionController,
      detailAchievementId,
      readOnly,
      setAchievements,
      setError,
      setIsSaving,
      uiActions,
    ],
  );

  const actions = useMemo<AchievementDataControllerActions>(
    () => ({
      loadAchievements,
      deleteAchievementById,
    }),
    [deleteAchievementById, loadAchievements],
  );

  return {
    isLoading,
    actions,
    loadAchievements,
  };
}
