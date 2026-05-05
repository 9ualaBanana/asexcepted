"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AchievementBadgeDebugOverlay } from "@/components/achievements/achievement-badge-debug-overlay";
import { AchievementDeleteConfirmDialog } from "@/components/achievements/achievement-delete-confirm-dialog";
import { AchievementDialogStack } from "@/components/achievements/achievement-dialog-stack";
import { AchievementGrid } from "@/components/achievements/achievement-grid";
import {
  createInitialForm,
  sortAchievements,
} from "@/components/achievements/achievement-manager-utils";
import { AchievementManualEmbedDialog } from "@/components/achievements/achievement-manual-embed-dialog";
import {
  clearBadgeRenderCacheForSrc,
} from "@/lib/badge/render-cache";
import {
  type FormState,
} from "@/components/achievements/achievement-editor-shared";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { createClient } from "@/lib/supabase/client";
import { useAchievementBadgeMetricsController } from "@/components/achievements/use-achievement-badge-metrics-controller";
import { useAchievementUnlockReveal } from "@/components/achievements/use-achievement-unlock-reveal";
import { useBadgeChunkedPrewarm } from "@/components/achievements/use-badge-chunked-prewarm";
import { useAchievementEmbedLinkController } from "@/components/achievements/use-achievement-embed-link-controller";
import { useAchievementDetailViewModel } from "@/components/achievements/use-achievement-detail-view-model";
import { useAchievementBadgeSessionController } from "@/components/achievements/use-achievement-badge-session-controller";
import { useAchievementEditorPipelineController } from "@/components/achievements/use-achievement-editor-pipeline-controller";
import { useAchievementUiStateMachine } from "@/components/achievements/use-achievement-ui-state-machine";
import {
  deleteAchievement,
  listAchievements,
} from "@/components/achievements/achievement-db";
import {
  achievementToGridItem,
  achievementToForm,
  type AchievementRecord,
} from "@/components/achievements/achievement-transformers";

export type AchievementsManagerProps = {
  /** Supabase Auth user id (`auth.users.id`); scopes achievements rows. */
  userId: string;
  /** When true, list and detail are view-only (no create / edit / delete / unlock). */
  readOnly: boolean;
};

export function AchievementsManager({
  userId,
  readOnly,
}: AchievementsManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(createInitialForm);
  const [panelForm, setPanelForm] = useState<FormState>(createInitialForm);
  const uiState = useAchievementUiStateMachine();
  const badgeSessionController = useAchievementBadgeSessionController({
    isCreating: uiState.isCreating,
    detailMode: uiState.detailMode,
  });

  const detailAchievement = useMemo(() => {
    if (!uiState.detailAchievementId) return null;
    return achievements.find((a) => a.id === uiState.detailAchievementId) ?? null;
  }, [achievements, uiState.detailAchievementId]);
  const badgeMetricsController = useAchievementBadgeMetricsController(detailAchievement);
  const embedLinkController = useAchievementEmbedLinkController({
    detailAchievementId: detailAchievement?.id ?? null,
  });
  const detailRenderSrc = useMemo(() => {
    const src = detailAchievement?.icon_url?.trim() ?? "";
    if (!src) return "";
    return toOptimizedBadgeRenderSrc(src);
  }, [detailAchievement?.icon_url]);

  const {
    playSavePop,
    detailIsUnlocking,
    detailIsLockedUi,
    detailFloating,
    optimisticUnlockedAchievementId,
    unlockRevealClipPath,
    unlockAlphaMaskRef,
    cancelUnlockHold,
    startUnlockHold,
    resetUnlockWave,
  } = useAchievementUnlockReveal({
    readOnly,
    detailAchievement,
    detailRenderSrc,
    isSaving,
    setIsSaving,
    setError,
    setAchievements,
    supabase,
  });
  const { DetailFallbackIcon, detailTone, detailMaskStyle } = useAchievementDetailViewModel({
    detailAchievement,
    detailRenderSrc,
    optimisticUnlockedAchievementId,
    detailIsLockedUi,
    readOnly,
  });
  const editorPipelineController = useAchievementEditorPipelineController({
    readOnly,
    createForm,
    panelForm,
    detailAchievementId: uiState.detailAchievementId,
    detailAchievement,
    badgeSessionController,
    supabase,
    setError,
    setIsSaving,
    setAchievements,
    setCreateForm,
    setPanelForm,
    playSavePop,
    uiState,
  });
  useEffect(() => {
    if (
      uiState.detailAchievementId &&
      !achievements.some((a) => a.id === uiState.detailAchievementId)
    ) {
      uiState.closeOverlay();
    }
  }, [achievements, uiState]);

  const achievementOverlayOpen = uiState.achievementOverlayOpen;
  const editorUploadInProgress = badgeSessionController.editorUploadInProgress;

  useBadgeChunkedPrewarm({ achievements, pause: achievementOverlayOpen });

  function closeDetailPanel() {
    if (editorUploadInProgress) return;
    if (uiState.isCreating) {
      badgeSessionController.rollbackCreateBadgeSession();
      setCreateForm(createInitialForm());
      badgeSessionController.setCreateUploadInProgress(false);
    }
    if (uiState.detailMode === "edit" && detailAchievement) {
      badgeSessionController.rollbackPanelBadgeSession();
      setPanelForm(achievementToForm(detailAchievement));
      badgeSessionController.setPanelUploadInProgress(false);
    }
    uiState.closeOverlay();
    resetUnlockWave();
    setIsSaving(false);
    embedLinkController.setManualEmbedUrl(null);
  }

  const loadAchievements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await listAchievements(supabase, userId);

    if (result.isErr()) {
      setError(result.error);
      setAchievements([]);
      setIsLoading(false);
      return;
    }

    const loadedAchievements = result.value;
    setAchievements(sortAchievements(loadedAchievements));
    setIsLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

  async function handleDelete(id: string) {
    if (readOnly) return;
    setIsSaving(true);
    setError(null);

    const target = achievements.find((a) => a.id === id);
    const targetSrc = target?.icon_url?.trim() ?? "";
    await badgeSessionController.deleteRemoteFilesForAchievement(
      target,
      id,
      uiState.detailAchievementId,
    );

    const deleteResult = await deleteAchievement(supabase, id);

    if (deleteResult.isErr()) {
      setError(deleteResult.error);
      setIsSaving(false);
      return;
    }

    setAchievements((prev) => prev.filter((achievement) => achievement.id !== id));
    if (targetSrc) {
      clearBadgeRenderCacheForSrc(targetSrc);
      clearBadgeRenderCacheForSrc(toOptimizedBadgeRenderSrc(targetSrc));
    }
    if (uiState.detailAchievementId === id) {
      uiState.closeOverlay();
    }
    uiState.clearDelete();
    setIsSaving(false);
  }

  const gridItems = useMemo(
    () => achievements.map(achievementToGridItem),
    [achievements],
  );

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <AchievementGrid
        isLoading={isLoading}
        readOnly={readOnly}
        items={gridItems}
        onAddAchievement={editorPipelineController.startCreateFlow}
        onSelectAchievement={(achievementId) => {
          badgeMetricsController.markDetailOpenStart(achievementId);
          uiState.openDetailView(achievementId);
        }}
      />

      {achievementOverlayOpen ? (
        <AchievementDialogStack
          readOnly={readOnly}
          editorUploadInProgress={editorUploadInProgress}
          closeDetailPanel={closeDetailPanel}
          isCreating={uiState.isCreating}
          createForm={createForm}
          setCreateForm={setCreateForm}
          setCreateUploadInProgress={badgeSessionController.setCreateUploadInProgress}
          createBadgeIkSessionRef={badgeSessionController.createBadgeIkSessionRef}
          onSubmitCreate={editorPipelineController.submitCreate}
          onCancelCreate={editorPipelineController.cancelCreateFlow}
          detailMode={uiState.detailMode}
          detailAchievement={detailAchievement}
          panelForm={panelForm}
          setPanelForm={setPanelForm}
          setPanelUploadInProgress={badgeSessionController.setPanelUploadInProgress}
          panelBadgeIkSessionRef={badgeSessionController.panelBadgeIkSessionRef}
          onSubmitPanelSave={editorPipelineController.submitPanelSave}
          onCancelPanelEdit={editorPipelineController.cancelPanelEditFlow}
          onRequestPanelEdit={editorPipelineController.startPanelEditFlow}
          detailIsUnlocking={detailIsUnlocking}
          detailIsLockedUi={detailIsLockedUi}
          detailFloating={detailFloating}
          detailRenderSrc={detailRenderSrc}
          detailTone={detailTone}
          DetailFallbackIcon={DetailFallbackIcon}
          unlockRevealClipPath={unlockRevealClipPath}
          detailMaskStyle={detailMaskStyle}
          unlockAlphaMaskRef={unlockAlphaMaskRef}
          startUnlockHold={startUnlockHold}
          cancelUnlockHold={cancelUnlockHold}
          onDetailBadgeImageDecoded={badgeMetricsController.handleDetailBadgeImageDecoded}
          onDetailBadgeVisualReady={badgeMetricsController.handleDetailBadgeVisualReady}
          optimisticUnlockedAchievementId={optimisticUnlockedAchievementId}
          isSaving={isSaving}
          embedCopyBusy={embedLinkController.embedCopyBusy}
          embedCopyHint={embedLinkController.embedCopyHint}
          onCopyEmbedLink={embedLinkController.copyEmbedLink}
          onRequestDelete={uiState.requestDelete}
        />
      ) : null}

      {uiState.deleteConfirmId ? (
        <AchievementDeleteConfirmDialog
          isSaving={isSaving}
          onDismiss={uiState.clearDelete}
          onConfirm={() => void handleDelete(uiState.deleteConfirmId!)}
        />
      ) : null}

      {embedLinkController.manualEmbedUrl ? (
        <AchievementManualEmbedDialog
          manualEmbedUrl={embedLinkController.manualEmbedUrl}
          onDismiss={() => embedLinkController.setManualEmbedUrl(null)}
          onCopied={embedLinkController.onManualEmbedCopied}
        />
      ) : null}

      {badgeMetricsController.badgeDebugOverlay ? (
        <AchievementBadgeDebugOverlay
          detailOpenToImageDecodedMs={badgeMetricsController.detailOpenToImageDecodedMs}
          detailOpenToVisualReadyMs={badgeMetricsController.detailOpenToVisualReadyMs}
        />
      ) : null}
    </div>
  );
}
