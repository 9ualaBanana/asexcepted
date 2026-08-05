"use client";

import { useCallback, type FormEvent } from "react";

import { ACHIEVEMENT_UI_COPY } from "@/components/achievements/share/achievement-ui-copy";
import { createAchievement, updateAchievement } from "@/lib/achievements/data/achievement-repository";
import {
  canEditDedicatedVisibility,
  isDedicatedAchievement,
} from "@/lib/achievements/dedication/dedication-utils";
import { createInitialForm } from "@/components/achievements/achievement-manager-utils";
import {
  type FormState,
  hasMeaningfulContent,
} from "@/lib/achievements/data/achievement-form-state";
import type {
  AchievementCollectionEntryViewModel,
  AchievementDetailViewModel,
} from "@/lib/achievements/data/achievement-view-models";
import {
  achievementDetailToForm,
  formToPayload,
  upsertCollectionEntry,
  updateCollectionEntryDetail,
} from "@/lib/achievements/data/achievement-view-models";
import type { BadgeSessionController } from "@/components/achievements/badge/upload/use-badge-session-controller";
import type { AchievementUiStateActions } from "@/components/achievements/hooks/use-achievement-ui-state-machine";
import type { DomRectLite } from "@/lib/achievements/ui/overlay-transition";
import { clearBadgeRenderCacheForSrc, prewarmBadgeRenderCache } from "@/lib/achievements/badge/shared/render-cache";
import { normalizeNetworkFailureMessage } from "@/lib/client/fetch-json";
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
  detailAchievement: AchievementDetailViewModel | null;
  badgeSessionController: BadgeSessionController;
  supabase: SupabaseClient;
  setError: (value: string | null) => void;
  setIsSaving: (value: boolean) => void;
  setAchievements: (
    value:
      | AchievementCollectionEntryViewModel[]
      | ((
          prev: AchievementCollectionEntryViewModel[],
        ) => AchievementCollectionEntryViewModel[]),
  ) => void;
  setCreateForm: (value: FormState | ((prev: FormState) => FormState)) => void;
  setPanelForm: (value: FormState | ((prev: FormState) => FormState)) => void;
  playSavePop: () => void;
  uiActions: AchievementUiStateActions;
  resetUnlockWave: () => void;
};

export type AchievementEditorPipelineActions = {
  startCreateFlow: (originRect: DomRectLite | null) => void;
  startDedicateFlow: (originRect: DomRectLite | null) => void;
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
      setPanelForm(achievementDetailToForm(detailAchievement));
      uiActions.exitDetailEdit();
      return true;
    }

    if (badgeSessionController.editorUploadInProgress) return false;

    badgeSessionController.rollbackPanelBadgeSession();
    setPanelForm(achievementDetailToForm(detailAchievement));
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
        setPanelForm(achievementDetailToForm(detailAchievement));
        uiActions.exitDetailEdit();
      } else {
        badgeSessionController.rollbackPanelBadgeSession();
        setPanelForm(achievementDetailToForm(detailAchievement));
        badgeSessionController.setPanelUploadInProgress(false);
        uiActions.exitDetailEdit();
      }
    }
    uiActions.requestCloseOverlay();
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

  const startCreateFlow = useCallback(
    (originRect: DomRectLite | null) => {
      setIsDedicatingCreate(false);
      badgeSessionController.beginCreateBadgeSession();
      uiActions.openCreate(originRect);
      setCreateForm(createInitialForm());
    },
    [badgeSessionController, setCreateForm, setIsDedicatingCreate, uiActions],
  );

  const startDedicateFlow = useCallback(
    (originRect: DomRectLite | null) => {
      if (!canDedicate) return;
      setIsDedicatingCreate(true);
      badgeSessionController.beginCreateBadgeSession();
      uiActions.openCreate(originRect);
      setCreateForm({
        ...createInitialForm(),
        isLocked: true,
        visibility: "public",
      });
    },
    [
      badgeSessionController,
      canDedicate,
      setCreateForm,
      setIsDedicatingCreate,
      uiActions,
    ],
  );

  const startPanelEditFlow = useCallback(() => {
    if (!detailAchievement) return;
    if (isDedicatedAchievement(detailAchievement)) return;
    badgeSessionController.beginPanelBadgeSession(detailAchievement);
    setPanelForm(achievementDetailToForm(detailAchievement));
    uiActions.enterDetailEdit();
  }, [badgeSessionController, detailAchievement, setPanelForm, uiActions]);

  const startPanelVisibilityEditFlow = useCallback(() => {
    if (!detailAchievement) return;
    if (!canEditDedicatedVisibility(detailAchievement)) return;
    setPanelForm(achievementDetailToForm(detailAchievement));
    uiActions.enterDetailVisibilityEdit();
  }, [detailAchievement, setPanelForm, uiActions]);

  const closeDetailPanel = useCallback(() => {
    closeOverlayFlow();
  }, [closeOverlayFlow]);

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
        if (formForSave !== createForm) {
          setCreateForm(formForSave);
        }
      } catch (finalizeError) {
        setError(
          finalizeError instanceof Error
            ? normalizeNetworkFailureMessage(finalizeError.message)
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
      if (createdAchievement.renderSrc) {
        prewarmBadgeRenderCache(createdAchievement.renderSrc, {
          motionSeed: createdAchievement.id,
          includeAlphaMaskData: createdAchievement.isLocked && !readOnly,
        });
      }
      playSavePop();
      setAchievements((prev) => upsertCollectionEntry(prev, createdAchievement));
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
        if (formForSave !== panelForm) {
          setPanelForm(formForSave);
        }
      } catch (finalizeError) {
        setError(
          finalizeError instanceof Error
            ? normalizeNetworkFailureMessage(finalizeError.message)
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
      const previousSrc = detailAchievement?.renderSrc ?? null;
      const nextSrc = updatedAchievement.renderSrc;
      if (previousSrc && previousSrc !== nextSrc) {
        clearBadgeRenderCacheForSrc(previousSrc);
      }
      if (nextSrc) {
        prewarmBadgeRenderCache(nextSrc, {
          motionSeed: updatedAchievement.id,
          includeAlphaMaskData: updatedAchievement.isLocked && !readOnly,
        });
      }
      playSavePop();

      const replacedBaselineRef =
        badgeSessionController.commitPanelBadgeSession(updatedAchievement);
      if (replacedBaselineRef) {
        void badgeSessionController.deleteStorageRefQuietly(
          replacedBaselineRef,
          "Badge asset delete replaced baseline on achievement save",
        );
      }

      setAchievements((prev) =>
        updateCollectionEntryDetail(prev, updatedAchievement),
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
      setPanelForm,
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
      ...formToPayload(achievementDetailToForm(detailAchievement)),
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
    setAchievements((prev) => updateCollectionEntryDetail(prev, updatedAchievement));
    setPanelForm(achievementDetailToForm(updatedAchievement));
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
