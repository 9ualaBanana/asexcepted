"use client";

import { useCallback, type FormEvent } from "react";

import { ACHIEVEMENT_UI_COPY } from "@/components/achievements/achievement-ui-copy";
import { createAchievement, updateAchievement } from "@/components/achievements/achievement-db";
import {
  canEditDedicatedVisibility,
  isDedicatedAchievement,
} from "@/lib/achievements/dedication-utils";
import { createInitialForm, sortAchievements } from "@/components/achievements/achievement-manager-utils";
import { type FormState, hasMeaningfulContent } from "@/components/achievements/achievement-editor-shared";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import { achievementToForm, formToPayload } from "@/components/achievements/achievement-transformers";
import type { BadgeSessionController } from "@/components/achievements/use-badge-session-controller";
import type { AchievementUiStateActions } from "@/components/achievements/use-achievement-ui-state-machine";
import { clearBadgeRenderCacheForSrc, prewarmBadgeRenderCache } from "@/lib/badge/render-cache";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import type { SupabaseClient } from "@supabase/supabase-js";

type UseAchievementEditorPipelineControllerArgs = {
  readOnly: boolean;
  canDedicate?: boolean;
  isDedicatingCreate: boolean;
  setIsDedicatingCreate: (value: boolean) => void;
  onRequestDedicateConfirm: () => void;
  isCreating: boolean;
  detailMode: "view" | "edit";
  isVisibilityOnlyEdit: boolean;
  createForm: FormState;
  panelForm: FormState;
  detailAchievementId: string | null;
  detailAchievement: AchievementRecord | null;
  badgeSessionController: BadgeSessionController;
  supabase: SupabaseClient;
  setError: (value: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setAchievements: (value: AchievementRecord[] | ((prev: AchievementRecord[]) => AchievementRecord[])) => void;
  setCreateForm: (value: FormState | ((prev: FormState) => FormState)) => void;
  setPanelForm: (value: FormState | ((prev: FormState) => FormState)) => void;
  playSavePop: () => void;
  uiActions: AchievementUiStateActions;
  resetUnlockWave: () => void;
};

export type AchievementEditorPipelineActions = {
  startCreateFlow: () => void;
  startDedicateFlow: () => void;
  startPanelEditFlow: () => void;
  startPanelVisibilityEditFlow: () => void;
  submitCreate: (e: FormEvent) => Promise<void>;
  submitPanelSave: (e: FormEvent) => Promise<void>;
  submitPanelVisibilitySave: () => Promise<void>;
  closeOverlayFlow: () => boolean;
  cancelPanelEdit: () => boolean;
  closeDetailPanel: () => void;
};

export function useAchievementEditorPipelineController({
  readOnly,
  canDedicate = false,
  isDedicatingCreate,
  setIsDedicatingCreate,
  onRequestDedicateConfirm,
  isCreating,
  detailMode,
  isVisibilityOnlyEdit,
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
}: UseAchievementEditorPipelineControllerArgs) {
  const cancelPanelEdit = useCallback(() => {
    if (detailMode !== "edit" || !detailAchievement) return false;

    if (isVisibilityOnlyEdit) {
      setPanelForm(achievementToForm(detailAchievement));
      uiActions.exitDetailEdit();
      return true;
    }

    if (badgeSessionController.editorUploadInProgress) return false;

    badgeSessionController.rollbackPanelBadgeSession();
    setPanelForm(achievementToForm(detailAchievement));
    badgeSessionController.setPanelUploadInProgress(false);
    uiActions.exitDetailEdit();
    return true;
  }, [
    badgeSessionController,
    detailAchievement,
    detailMode,
    isVisibilityOnlyEdit,
    setPanelForm,
    uiActions,
  ]);

  const closeOverlayFlow = useCallback(() => {
    if (badgeSessionController.editorUploadInProgress) return false;

    if (isCreating) {
      badgeSessionController.rollbackCreateBadgeSession();
      setCreateForm(createInitialForm());
      badgeSessionController.setCreateUploadInProgress(false);
      setIsDedicatingCreate(false);
    }
    if (detailMode === "edit" && detailAchievement) {
      if (isVisibilityOnlyEdit) {
        setPanelForm(achievementToForm(detailAchievement));
        uiActions.exitDetailEdit();
      } else {
        badgeSessionController.rollbackPanelBadgeSession();
        setPanelForm(achievementToForm(detailAchievement));
        badgeSessionController.setPanelUploadInProgress(false);
        uiActions.exitDetailEdit();
      }
    }
    uiActions.closeOverlay();
    return true;
  }, [
    badgeSessionController,
    detailAchievement,
    detailMode,
    isVisibilityOnlyEdit,
    isCreating,
    setCreateForm,
    setIsDedicatingCreate,
    setPanelForm,
    uiActions,
  ]);

  const startCreateFlow = useCallback(() => {
    setIsDedicatingCreate(false);
    badgeSessionController.beginCreateBadgeSession();
    uiActions.openCreate();
    setCreateForm(createInitialForm());
  }, [badgeSessionController, setCreateForm, setIsDedicatingCreate, uiActions]);

  const startDedicateFlow = useCallback(() => {
    if (!canDedicate) return;
    setIsDedicatingCreate(true);
    badgeSessionController.beginCreateBadgeSession();
    uiActions.openCreate();
    setCreateForm({
      ...createInitialForm(),
      isLocked: true,
      visibility: "public",
    });
  }, [badgeSessionController, canDedicate, setCreateForm, setIsDedicatingCreate, uiActions]);

  const startPanelEditFlow = useCallback(() => {
    if (!detailAchievement) return;
    if (isDedicatedAchievement(detailAchievement)) return;
    badgeSessionController.beginPanelBadgeSession(detailAchievement);
    setPanelForm(achievementToForm(detailAchievement));
    uiActions.enterDetailEdit();
  }, [badgeSessionController, detailAchievement, setPanelForm, uiActions]);

  const startPanelVisibilityEditFlow = useCallback(() => {
    if (!detailAchievement) return;
    if (!canEditDedicatedVisibility(detailAchievement)) return;
    setPanelForm(achievementToForm(detailAchievement));
    uiActions.enterDetailVisibilityEdit();
  }, [detailAchievement, setPanelForm, uiActions]);

  const closeDetailPanel = useCallback(() => {
    const closed = closeOverlayFlow();
    if (!closed) return;
    resetUnlockWave();
    setIsSaving(false);
  }, [closeOverlayFlow, resetUnlockWave, setIsSaving]);

  const submitCreate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (readOnly && !canDedicate) return;
      if (!hasMeaningfulContent(createForm)) {
        setError(ACHIEVEMENT_UI_COPY.validationMeaningfulContent);
        return;
      }

      if (isDedicatingCreate) {
        onRequestDedicateConfirm();
        return;
      }

      if (readOnly) return;

      setIsSaving(true);
      setError(null);

      let formForSave = createForm;
      try {
        formForSave = await badgeSessionController.finalizeModelPoseForForm(createForm);
      } catch (finalizeError) {
        setError(
          finalizeError instanceof Error
            ? finalizeError.message
            : "Could not finalize 3D badge upload.",
        );
        setIsSaving(false);
        return;
      }

      const insertPayload = formToPayload(formForSave);
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
      canDedicate,
      createForm,
      isDedicatingCreate,
      onRequestDedicateConfirm,
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
      if (detailAchievement && isDedicatedAchievement(detailAchievement)) return;
      if (!hasMeaningfulContent(panelForm)) {
        setError(ACHIEVEMENT_UI_COPY.validationMeaningfulContent);
        return;
      }

      setIsSaving(true);
      setError(null);

      let formForSave = panelForm;
      try {
        formForSave = await badgeSessionController.finalizeModelPoseForForm(panelForm);
      } catch (finalizeError) {
        setError(
          finalizeError instanceof Error
            ? finalizeError.message
            : "Could not finalize 3D badge upload.",
        );
        setIsSaving(false);
        return;
      }

      const updatePayload = formToPayload(formForSave);
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

      const replacedBaselineAsset =
        badgeSessionController.commitPanelBadgeSession(updatedAchievement);
      if (replacedBaselineAsset) {
        void badgeSessionController.deleteRemoteAssetQuietly(
          replacedBaselineAsset,
          "Badge asset delete replaced baseline on achievement save",
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

  const submitPanelVisibilitySave = useCallback(async () => {
    if (readOnly) return;
    if (!detailAchievementId || !detailAchievement) return;
    if (!canEditDedicatedVisibility(detailAchievement)) return;
    if (panelForm.visibility === detailAchievement.visibility) {
      uiActions.exitDetailEdit();
      return;
    }

    setIsSaving(true);
    setError(null);

    const updatePayload = {
      ...formToPayload(achievementToForm(detailAchievement)),
      visibility: panelForm.visibility,
    };
    const result = await updateAchievement(supabase, detailAchievementId, updatePayload);

    if (result.isErr()) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    playSavePop();
    const updatedAchievement = result.value;
    setAchievements((prev) =>
      sortAchievements(
        prev.map((achievement) =>
          achievement.id === updatedAchievement.id ? updatedAchievement : achievement,
        ),
      ),
    );
    setPanelForm(achievementToForm(updatedAchievement));
    uiActions.exitDetailEdit();
    setIsSaving(false);
  }, [
    detailAchievement,
    detailAchievementId,
    panelForm.visibility,
    playSavePop,
    readOnly,
    setAchievements,
    setError,
    setIsSaving,
    setPanelForm,
    supabase,
    uiActions,
  ]);

  const actions: AchievementEditorPipelineActions = {
    startCreateFlow,
    startDedicateFlow,
    startPanelEditFlow,
    startPanelVisibilityEditFlow,
    submitCreate,
    submitPanelSave,
    submitPanelVisibilitySave,
    closeOverlayFlow,
    cancelPanelEdit,
    closeDetailPanel,
  };

  return { actions };
}
