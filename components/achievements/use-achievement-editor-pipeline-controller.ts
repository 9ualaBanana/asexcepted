"use client";

import { useCallback, type FormEvent } from "react";

import { ACHIEVEMENT_UI_COPY } from "@/components/achievements/achievement-ui-copy";
import { createAchievement, updateAchievement } from "@/components/achievements/achievement-db";
import { createInitialForm, sortAchievements } from "@/components/achievements/achievement-manager-utils";
import { type FormState, hasMeaningfulContent } from "@/components/achievements/achievement-editor-shared";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import { achievementToForm, formToPayload } from "@/components/achievements/achievement-transformers";
import type { AchievementBadgeSessionController } from "@/components/achievements/use-achievement-badge-session-controller";
import { clearBadgeRenderCacheForSrc, prewarmBadgeRenderCache } from "@/lib/badge/render-cache";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import type { SupabaseClient } from "@supabase/supabase-js";

type UseAchievementEditorPipelineControllerArgs = {
  readOnly: boolean;
  createForm: FormState;
  panelForm: FormState;
  detailAchievementId: string | null;
  detailAchievement: AchievementRecord | null;
  badgeSessionController: AchievementBadgeSessionController;
  supabase: SupabaseClient;
  setError: (value: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setAchievements: (value: AchievementRecord[] | ((prev: AchievementRecord[]) => AchievementRecord[])) => void;
  setCreateForm: (value: FormState | ((prev: FormState) => FormState)) => void;
  setIsCreating: (value: boolean) => void;
  setDetailAchievementId: (value: string | null) => void;
  setDetailMode: (value: "view" | "edit") => void;
  setPanelForm: (value: FormState | ((prev: FormState) => FormState)) => void;
  playSavePop: () => void;
};

export function useAchievementEditorPipelineController({
  readOnly,
  createForm,
  panelForm,
  detailAchievementId,
  detailAchievement,
  badgeSessionController,
  supabase,
  setError,
  setIsSaving,
  setAchievements,
  setCreateForm,
  setIsCreating,
  setDetailAchievementId,
  setDetailMode,
  setPanelForm,
  playSavePop,
}: UseAchievementEditorPipelineControllerArgs) {
  const startCreateFlow = useCallback(() => {
    badgeSessionController.beginCreateBadgeSession();
    setIsCreating(true);
    setDetailAchievementId(null);
    setDetailMode("edit");
    setCreateForm(createInitialForm());
  }, [badgeSessionController, setCreateForm, setDetailAchievementId, setDetailMode, setIsCreating]);

  const cancelCreateFlow = useCallback(() => {
    if (badgeSessionController.createUploadInProgress) return;
    badgeSessionController.rollbackCreateBadgeSession();
    setCreateForm(createInitialForm());
    setIsCreating(false);
    badgeSessionController.setCreateUploadInProgress(false);
    setDetailMode("view");
  }, [badgeSessionController, setCreateForm, setDetailMode, setIsCreating]);

  const startPanelEditFlow = useCallback(() => {
    if (!detailAchievement) return;
    badgeSessionController.beginPanelBadgeSession(detailAchievement);
    setPanelForm(achievementToForm(detailAchievement));
    setDetailMode("edit");
  }, [badgeSessionController, detailAchievement, setDetailMode, setPanelForm]);

  const cancelPanelEditFlow = useCallback(() => {
    if (badgeSessionController.panelUploadInProgress) return;
    badgeSessionController.rollbackPanelBadgeSession();
    if (detailAchievement) {
      setPanelForm(achievementToForm(detailAchievement));
    }
    badgeSessionController.setPanelUploadInProgress(false);
    setDetailMode("view");
  }, [badgeSessionController, detailAchievement, setDetailMode, setPanelForm]);

  const submitCreate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (readOnly) return;
      if (!hasMeaningfulContent(createForm)) {
        setError(ACHIEVEMENT_UI_COPY.validationMeaningfulContent);
        return;
      }

      setIsSaving(true);
      setError(null);

      const insertPayload = formToPayload(createForm);
      const result = await createAchievement(supabase, insertPayload);

      if (result.isErr()) {
        setError(result.error);
        setIsSaving(false);
        return;
      }

      const createdAchievement = result.value;
      const createdSrc = createdAchievement.icon_url?.trim() ?? "";
      if (createdSrc) {
        const renderSrc = toOptimizedBadgeRenderSrc(createdSrc);
        prewarmBadgeRenderCache(createdSrc, {
          motionSeed: createdAchievement.id,
          includeAlphaMaskData: Boolean(createdAchievement.is_locked) && !readOnly,
        });
        prewarmBadgeRenderCache(renderSrc, { motionSeed: createdAchievement.id });
      }
      playSavePop();
      setAchievements((prev) => sortAchievements([createdAchievement, ...prev]));
      setCreateForm(createInitialForm());
      badgeSessionController.beginCreateBadgeSession();
      setIsSaving(false);
      setIsCreating(false);
      setDetailAchievementId(null);
      setDetailMode("view");
    },
    [
      badgeSessionController,
      createForm,
      playSavePop,
      readOnly,
      setAchievements,
      setCreateForm,
      setDetailAchievementId,
      setDetailMode,
      setError,
      setIsCreating,
      setIsSaving,
      supabase,
    ],
  );

  const submitPanelSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (readOnly) return;
      if (!detailAchievementId) return;
      if (!hasMeaningfulContent(panelForm)) {
        setError(ACHIEVEMENT_UI_COPY.validationMeaningfulContent);
        return;
      }

      setIsSaving(true);
      setError(null);

      const updatePayload = formToPayload(panelForm);
      const result = await updateAchievement(supabase, detailAchievementId, updatePayload);

      if (result.isErr()) {
        setError(result.error);
        setIsSaving(false);
        return;
      }

      const updatedAchievement = result.value;
      const previousSrc = detailAchievement?.icon_url?.trim() ?? "";
      const nextSrc = updatedAchievement.icon_url?.trim() ?? "";
      if (previousSrc && previousSrc !== nextSrc) {
        clearBadgeRenderCacheForSrc(previousSrc);
        clearBadgeRenderCacheForSrc(toOptimizedBadgeRenderSrc(previousSrc));
      }
      if (nextSrc) {
        const renderSrc = toOptimizedBadgeRenderSrc(nextSrc);
        prewarmBadgeRenderCache(nextSrc, {
          motionSeed: updatedAchievement.id,
          includeAlphaMaskData: Boolean(updatedAchievement.is_locked) && !readOnly,
        });
        prewarmBadgeRenderCache(renderSrc, { motionSeed: updatedAchievement.id });
      }
      playSavePop();

      const replacedBaselineId = badgeSessionController.commitPanelBadgeSession(updatedAchievement);
      if (replacedBaselineId) {
        void badgeSessionController.deleteRemoteFileIdQuietly(
          replacedBaselineId,
          "ImageKit delete replaced baseline on achievement save",
        );
      }

      setAchievements((prev) =>
        sortAchievements(
          prev.map((achievement) =>
            achievement.id === updatedAchievement.id ? updatedAchievement : achievement,
          ),
        ),
      );
      setDetailMode("view");
      setIsSaving(false);
    },
    [
      badgeSessionController,
      detailAchievement,
      detailAchievementId,
      panelForm,
      playSavePop,
      readOnly,
      setAchievements,
      setDetailMode,
      setError,
      setIsSaving,
      supabase,
    ],
  );

  return {
    startCreateFlow,
    cancelCreateFlow,
    startPanelEditFlow,
    cancelPanelEditFlow,
    submitCreate,
    submitPanelSave,
  };
}
