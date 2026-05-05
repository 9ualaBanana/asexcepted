"use client";

import {
  useMemo,
  useState,
} from "react";

import { AchievementBadgeDebugOverlay } from "@/components/achievements/achievement-badge-debug-overlay";
import { AchievementDeleteConfirmDialog } from "@/components/achievements/achievement-delete-confirm-dialog";
import { AchievementDialogStack } from "@/components/achievements/achievement-dialog-stack";
import { AchievementGrid } from "@/components/achievements/achievement-grid";
import {
  createInitialForm,
} from "@/components/achievements/achievement-manager-utils";
import { AchievementManualEmbedDialog } from "@/components/achievements/achievement-manual-embed-dialog";
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
import { useAchievementDataController } from "@/components/achievements/use-achievement-data-controller";
import { useAchievementDetailSelectionController } from "@/components/achievements/use-achievement-detail-selection-controller";
import { useAchievementUiStateMachine } from "@/components/achievements/use-achievement-ui-state-machine";
import {
  achievementToGridItem,
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(createInitialForm);
  const [panelForm, setPanelForm] = useState<FormState>(createInitialForm);
  const ui = useAchievementUiStateMachine();
  const badgeSession = useAchievementBadgeSessionController({
    isCreating: ui.isCreating,
    detailMode: ui.detailMode,
  });

  const { detailAchievement } = useAchievementDetailSelectionController({
    achievements,
    detailAchievementId: ui.detailAchievementId,
    uiActions: ui.actions,
  });
  const badgeMetrics = useAchievementBadgeMetricsController(detailAchievement);
  const embedLink = useAchievementEmbedLinkController({
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
  const editorPipeline = useAchievementEditorPipelineController({
    readOnly,
    isCreating: ui.isCreating,
    detailMode: ui.detailMode,
    createForm,
    panelForm,
    detailAchievementId: ui.detailAchievementId,
    detailAchievement,
    badgeSessionController: badgeSession,
    supabase,
    setError,
    setIsSaving,
    setAchievements,
    setCreateForm,
    setPanelForm,
    playSavePop,
    uiActions: ui.actions,
    resetUnlockWave,
    clearManualEmbedUrl: () => embedLink.setManualEmbedUrl(null),
  });
  const data = useAchievementDataController({
    supabase,
    userId,
    readOnly,
    achievements,
    detailAchievementId: ui.detailAchievementId,
    setAchievements,
    setError,
    setIsSaving,
    badgeSessionController: badgeSession,
    uiActions: ui.actions,
  });
  const achievementOverlayOpen = ui.achievementOverlayOpen;

  useBadgeChunkedPrewarm({ achievements, pause: achievementOverlayOpen });

  const gridItems = useMemo(
    () => achievements.map(achievementToGridItem),
    [achievements],
  );

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <AchievementGrid
        isLoading={data.isLoading}
        readOnly={readOnly}
        items={gridItems}
        onAddAchievement={editorPipeline.actions.startCreateFlow}
        onSelectAchievement={(achievementId) => {
          badgeMetrics.markDetailOpenStart(achievementId);
          ui.actions.openDetailView(achievementId);
        }}
      />

      {achievementOverlayOpen ? (
        <AchievementDialogStack
          readOnly={readOnly}
          editorUploadInProgress={badgeSession.editorUploadInProgress}
          closeDetailPanel={editorPipeline.actions.closeDetailPanel}
          isCreating={ui.isCreating}
          createForm={createForm}
          setCreateForm={setCreateForm}
          setCreateUploadInProgress={badgeSession.setCreateUploadInProgress}
          createBadgeIkSessionRef={badgeSession.createBadgeIkSessionRef}
          onSubmitCreate={editorPipeline.actions.submitCreate}
          onCancelCreate={editorPipeline.actions.closeOverlayFlow}
          detailMode={ui.detailMode}
          detailAchievement={detailAchievement}
          panelForm={panelForm}
          setPanelForm={setPanelForm}
          setPanelUploadInProgress={badgeSession.setPanelUploadInProgress}
          panelBadgeIkSessionRef={badgeSession.panelBadgeIkSessionRef}
          onSubmitPanelSave={editorPipeline.actions.submitPanelSave}
          onCancelPanelEdit={editorPipeline.actions.closeOverlayFlow}
          onRequestPanelEdit={editorPipeline.actions.startPanelEditFlow}
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
          onDetailBadgeImageDecoded={badgeMetrics.handleDetailBadgeImageDecoded}
          onDetailBadgeVisualReady={badgeMetrics.handleDetailBadgeVisualReady}
          optimisticUnlockedAchievementId={optimisticUnlockedAchievementId}
          isSaving={isSaving}
          embedCopyBusy={embedLink.embedCopyBusy}
          embedCopyHint={embedLink.embedCopyHint}
          onCopyEmbedLink={embedLink.copyEmbedLink}
          onRequestDelete={ui.actions.requestDelete}
        />
      ) : null}

      {ui.deleteConfirmId ? (
        <AchievementDeleteConfirmDialog
          isSaving={isSaving}
          onDismiss={ui.actions.clearDelete}
          onConfirm={() => void data.actions.deleteAchievementById(ui.deleteConfirmId!)}
        />
      ) : null}

      {embedLink.manualEmbedUrl ? (
        <AchievementManualEmbedDialog
          manualEmbedUrl={embedLink.manualEmbedUrl}
          onDismiss={() => embedLink.setManualEmbedUrl(null)}
          onCopied={embedLink.onManualEmbedCopied}
        />
      ) : null}

      {badgeMetrics.badgeDebugOverlay ? (
        <AchievementBadgeDebugOverlay
          detailOpenToImageDecodedMs={badgeMetrics.detailOpenToImageDecodedMs}
          detailOpenToVisualReadyMs={badgeMetrics.detailOpenToVisualReadyMs}
        />
      ) : null}
    </div>
  );
}
