"use client";

import { useCallback, type FormEvent } from "react";

import { ACHIEVEMENT_UI_COPY } from "@/components/achievements/achievement-ui-copy";
import { createAchievement, updateAchievement } from "@/components/achievements/achievement-db";
import { createInitialForm, sortAchievements } from "@/components/achievements/achievement-manager-utils";
import { type FormState, hasMeaningfulContent } from "@/components/achievements/achievement-editor-shared";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import { achievementToForm, formToPayload } from "@/components/achievements/achievement-transformers";
import type { AchievementBadgeSessionController } from "@/components/achievements/use-achievement-badge-session-controller";
import type { AchievementUiStateActions } from "@/components/achievements/use-achievement-ui-state-machine";
import { clearBadgeRenderCacheForSrc, prewarmBadgeRenderCache } from "@/lib/badge/render-cache";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import type { SupabaseClient } from "@supabase/supabase-js";

type UseAchievementEditorPipelineControllerArgs = {
  readOnly: boolean;
  isCreating: boolean;
  detailMode: "view" | "edit";
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
  setPanelForm: (value: FormState | ((prev: FormState) => FormState)) => void;
  playSavePop: () => void;
  uiActions: AchievementUiStateActions;
  resetUnlockWave: () => void;
  clearManualEmbedUrl: () => void;
};

export type AchievementEditorPipelineActions = {
  startCreateFlow: () => void;
  startPanelEditFlow: () => void;
  submitCreate: (e: FormEvent) => Promise<void>;
  submitPanelSave: (e: FormEvent) => Promise<void>;
  closeOverlayFlow: () => boolean;
  cancelPanelEdit: () => boolean;
  closeDetailPanel: () => void;
};

export function useAchievementEditorPipelineController({
  readOnly,
  isCreating,
  detailMode,
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
  setPanelForm,
  playSavePop,
  uiActions,
  resetUnlockWave,
  clearManualEmbedUrl,
}: UseAchievementEditorPipelineControllerArgs) {
  const cancelPanelEdit = useCallback(() => {
    if (badgeSessionController.editorUploadInProgress) return false;
    if (detailMode !== "edit" || !detailAchievement) return false;

    badgeSessionController.rollbackPanelBadgeSession();
    setPanelForm(achievementToForm(detailAchievement));
    badgeSessionController.setPanelUploadInProgress(false);
    uiActions.exitDetailEdit();
    return true;
  }, [
    badgeSessionController,
    detailAchievement,
    detailMode,
    setPanelForm,
    uiActions,
  ]);

  const closeOverlayFlow = useCallback(() => {
    if (badgeSessionController.editorUploadInProgress) return false;

    if (isCreating) {
      badgeSessionController.rollbackCreateBadgeSession();
      setCreateForm(createInitialForm());
      badgeSessionController.setCreateUploadInProgress(false);
    }
    if (detailMode === "edit" && detailAchievement) {
      badgeSessionController.rollbackPanelBadgeSession();
      setPanelForm(achievementToForm(detailAchievement));
      badgeSessionController.setPanelUploadInProgress(false);
      uiActions.exitDetailEdit();
    }
    uiActions.closeOverlay();
    return true;
  }, [
    badgeSessionController,
    detailAchievement,
    detailMode,
    isCreating,
    setCreateForm,
    setPanelForm,
    uiActions,
  ]);

  const startCreateFlow = useCallback(() => {
    badgeSessionController.beginCreateBadgeSession();
    uiActions.openCreate();
    setCreateForm(createInitialForm());
  }, [badgeSessionController, setCreateForm, uiActions]);

  const startPanelEditFlow = useCallback(() => {
    if (!detailAchievement) return;
    badgeSessionController.beginPanelBadgeSession(detailAchievement);
    setPanelForm(achievementToForm(detailAchievement));
    uiActions.enterDetailEdit();
  }, [badgeSessionController, detailAchievement, setPanelForm, uiActions]);

  const closeDetailPanel = useCallback(() => {
    const closed = closeOverlayFlow();
    if (!closed) return;
    resetUnlockWave();
    setIsSaving(false);
    clearManualEmbedUrl();
  }, [clearManualEmbedUrl, closeOverlayFlow, resetUnlockWave, setIsSaving]);

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
        prewarmBadgeRenderCache(renderSrc, {
          motionSeed: createdAchievement.id,
          includeAlphaMaskData: Boolean(createdAchievement.is_locked) && !readOnly,
        });
      }
      playSavePop();
      setAchievements((prev) => sortAchievements([createdAchievement, ...prev]));
      setCreateForm(createInitialForm());
      badgeSessionController.beginCreateBadgeSession();
      setIsSaving(false);
      uiActions.closeOverlay();
    },
    [
      badgeSessionController,
      createForm,
      playSavePop,
      readOnly,
      setAchievements,
      setCreateForm,
      setError,
      setIsSaving,
      supabase,
      uiActions,
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
        clearBadgeRenderCacheForSrc(toOptimizedBadgeRenderSrc(previousSrc));
      }
      if (nextSrc) {
        const renderSrc = toOptimizedBadgeRenderSrc(nextSrc);
        prewarmBadgeRenderCache(renderSrc, {
          motionSeed: updatedAchievement.id,
          includeAlphaMaskData: Boolean(updatedAchievement.is_locked) && !readOnly,
        });
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
      uiActions.exitDetailEdit();
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
      setError,
      setIsSaving,
      supabase,
      uiActions,
    ],
  );

  const actions: AchievementEditorPipelineActions = {
    startCreateFlow,
    startPanelEditFlow,
    submitCreate,
    submitPanelSave,
    closeOverlayFlow,
    cancelPanelEdit,
    closeDetailPanel,
  };

  return { actions };
}
