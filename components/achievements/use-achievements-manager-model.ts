"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createInitialForm } from "@/components/achievements/achievement-manager-utils";
import { type FormState } from "@/components/achievements/achievement-editor-shared";
import type { AchievementDialogStackProps } from "@/components/achievements/achievement-dialog-stack";
import {
  achievementToGridItem,
  type AchievementRecord,
} from "@/components/achievements/achievement-transformers";
import { useAchievementBadgeMetricsController } from "@/components/achievements/use-achievement-badge-metrics-controller";
import { useAchievementBadgeSessionController } from "@/components/achievements/use-achievement-badge-session-controller";
import { useAchievementDataController } from "@/components/achievements/use-achievement-data-controller";
import { useAchievementDetailSelectionController } from "@/components/achievements/use-achievement-detail-selection-controller";
import { useAchievementDetailViewModel } from "@/components/achievements/use-achievement-detail-view-model";
import { useAchievementEditorPipelineController } from "@/components/achievements/use-achievement-editor-pipeline-controller";
import { useAchievementEmbedLinkController } from "@/components/achievements/use-achievement-embed-link-controller";
import { useAchievementUiStateMachine } from "@/components/achievements/use-achievement-ui-state-machine";
import { useAchievementUnlockReveal } from "@/components/achievements/use-achievement-unlock-reveal";
import { useBadgeChunkedPrewarm } from "@/components/achievements/use-badge-chunked-prewarm";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { createClient } from "@/lib/supabase/client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UseAchievementsManagerModelArgs = {
  userId: string;
  readOnly: boolean;
  initialDetailAchievementId?: string | null;
};

export function useAchievementsManagerModel({
  userId,
  readOnly,
  initialDetailAchievementId,
}: UseAchievementsManagerModelArgs) {
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

  const deepLinkOpenedRef = useRef(false);
  useEffect(() => {
    if (deepLinkOpenedRef.current) return;
    if (!initialDetailAchievementId || !UUID_RE.test(initialDetailAchievementId)) return;
    if (data.isLoading) return;
    const exists = achievements.some((a) => a.id === initialDetailAchievementId);
    if (!exists) return;
    deepLinkOpenedRef.current = true;
    ui.actions.openDetailView(initialDetailAchievementId);
  }, [
    achievements,
    data.isLoading,
    initialDetailAchievementId,
    ui.actions,
  ]);

  const gridItems = useMemo(
    () => achievements.map(achievementToGridItem),
    [achievements],
  );

  const dialogStackProps: AchievementDialogStackProps = {
    readOnly,
    editorUploadInProgress: badgeSession.editorUploadInProgress,
    closeDetailPanel: editorPipeline.actions.closeDetailPanel,
    isCreating: ui.isCreating,
    createForm,
    setCreateForm,
    setCreateUploadInProgress: badgeSession.setCreateUploadInProgress,
    createBadgeIkSessionRef: badgeSession.createBadgeIkSessionRef,
    onSubmitCreate: editorPipeline.actions.submitCreate,
    onCancelCreate: editorPipeline.actions.closeOverlayFlow,
    detailMode: ui.detailMode,
    detailAchievement,
    panelForm,
    setPanelForm,
    setPanelUploadInProgress: badgeSession.setPanelUploadInProgress,
    panelBadgeIkSessionRef: badgeSession.panelBadgeIkSessionRef,
    onSubmitPanelSave: editorPipeline.actions.submitPanelSave,
    onCancelPanelEdit: editorPipeline.actions.closeOverlayFlow,
    onRequestPanelEdit: editorPipeline.actions.startPanelEditFlow,
    detailIsUnlocking,
    detailIsLockedUi,
    detailFloating,
    detailRenderSrc,
    detailTone,
    DetailFallbackIcon,
    unlockRevealClipPath,
    detailMaskStyle,
    unlockAlphaMaskRef,
    startUnlockHold,
    cancelUnlockHold,
    onDetailBadgeImageDecoded: badgeMetrics.handleDetailBadgeImageDecoded,
    onDetailBadgeVisualReady: badgeMetrics.handleDetailBadgeVisualReady,
    optimisticUnlockedAchievementId,
    isSaving,
    embedCopyBusy: embedLink.embedCopyBusy,
    embedCopyHint: embedLink.embedCopyHint,
    onCopyEmbedLink: embedLink.copyEmbedLink,
    onRequestDelete: ui.actions.requestDelete,
  };

  return {
    error,
    isSaving,
    readOnly,
    gridItems,
    dialogStackProps,
    createForm,
    setCreateForm,
    panelForm,
    setPanelForm,
    ui,
    badgeSession,
    badgeMetrics,
    embedLink,
    detailAchievement,
    detailRenderSrc,
    detailTone,
    detailMaskStyle,
    DetailFallbackIcon,
    data,
    editorPipeline,
    detailIsUnlocking,
    detailIsLockedUi,
    detailFloating,
    optimisticUnlockedAchievementId,
    unlockRevealClipPath,
    unlockAlphaMaskRef,
    startUnlockHold,
    cancelUnlockHold,
    achievementOverlayOpen,
  };
}
