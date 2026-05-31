"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { deleteAchievement, listAchievements } from "@/components/achievements/achievement-db";
import { sortAchievements } from "@/components/achievements/achievement-manager-utils";
import type { BadgeSessionController } from "@/components/achievements/use-badge-session-controller";
import type { AchievementUiStateActions } from "@/components/achievements/use-achievement-ui-state-machine";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import { clearBadgeRenderCacheForSrc } from "@/lib/badge/render-cache";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { useUserAchievementsLiveUpdates } from "@/lib/live-updates";
import type { SupabaseClient } from "@supabase/supabase-js";

type UseAchievementDataControllerArgs = {
  supabase: SupabaseClient;
  userId: string;
  readOnly: boolean;
  achievements: AchievementRecord[];
  detailAchievementId: string | null;
  setAchievements: (
    value: AchievementRecord[] | ((prev: AchievementRecord[]) => AchievementRecord[])
  ) => void;
  setError: (value: string | null) => void;
  setIsSaving: (value: boolean) => void;
  badgeSessionController: BadgeSessionController;
  uiActions: AchievementUiStateActions;
};

export type AchievementDataControllerActions = {
  loadAchievements: (opts?: {
    silent?: boolean;
  }) => Promise<AchievementRecord[] | null>;
  deleteAchievementById: (id: string) => Promise<void>;
};

export function useAchievementDataController({
  supabase,
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
    async (opts?: { silent?: boolean }): Promise<AchievementRecord[] | null> => {
      const silent = opts?.silent ?? false;
      if (!silent) setIsLoading(true);
      setError(null);

      const result = await listAchievements(supabase, userId);
      if (result.isErr()) {
        setError(result.error);
        if (!silent) setAchievements([]);
        if (!silent) setIsLoading(false);
        return null;
      }

      const sorted = sortAchievements(result.value);
      setAchievements(sorted);
      if (!silent) setIsLoading(false);
      return sorted;
    },
    [setAchievements, setError, supabase, userId],
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

      const target = achievements.find((a) => a.id === id);
      const targetSrc = target?.icon_url?.trim() ?? "";

      const deleteResult = await deleteAchievement(supabase, id);
      if (deleteResult.isErr()) {
        setError(deleteResult.error);
        setIsSaving(false);
        return;
      }

      await badgeSessionController.deleteRemoteFilesForAchievement(
        target,
        id,
        detailAchievementId,
      );

      setAchievements((prev) => prev.filter((achievement) => achievement.id !== id));
      if (targetSrc) {
        clearBadgeRenderCacheForSrc(toOptimizedBadgeRenderSrc(targetSrc));
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
      supabase,
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
