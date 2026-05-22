"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { createInitialForm } from "@/components/achievements/achievement-manager-utils";
import { type FormState } from "@/components/achievements/achievement-editor-shared";
import type { AchievementDialogStackProps } from "@/components/achievements/achievement-dialog-stack";
import {
  achievementToGridItem,
  isAchievementFormDirty,
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
import {
  resetHideLockedPreferenceForNewAccount,
  useHideLockedPreference,
} from "@/lib/achievements/hide-locked-preference";
import { userCollection } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UseAchievementsManagerModelArgs = {
  userId: string;
  readOnly: boolean;
  isAdmin?: boolean;
  initialDetailAchievementId?: string | null;
};

export function useAchievementsManagerModel({
  userId,
  readOnly,
  isAdmin = false,
  initialDetailAchievementId,
}: UseAchievementsManagerModelArgs) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const badgeMetrics = useAchievementBadgeMetricsController(detailAchievement, isAdmin);
  const [hideLocked, setHideLocked] = useHideLockedPreference();
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

  const deepLinkAchievementId = useMemo(() => {
    const fromQuery = searchParams.get("achievement")?.trim() ?? "";
    if (fromQuery && UUID_RE.test(fromQuery)) return fromQuery;
    const fromInitial = initialDetailAchievementId?.trim() ?? "";
    if (fromInitial && UUID_RE.test(fromInitial)) return fromInitial;
    return null;
  }, [initialDetailAchievementId, searchParams]);

  const lastDeepLinkedIdRef = useRef<string | null>(null);
  const deepLinkRefetchedForRef = useRef<string | null>(null);
  const onboardingHandledRef = useRef(false);

  useEffect(() => {
    if (readOnly || onboardingHandledRef.current) return;
    if (searchParams.get("onboarding") !== "1") return;
    onboardingHandledRef.current = true;
    resetHideLockedPreferenceForNewAccount();
    setHideLocked(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("onboarding");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, readOnly, router, searchParams, setHideLocked]);

  useEffect(() => {
    if (!deepLinkAchievementId) {
      deepLinkRefetchedForRef.current = null;
      return;
    }
    if (pathname !== userCollection(userId)) return;
    if (deepLinkRefetchedForRef.current === deepLinkAchievementId) return;
    deepLinkRefetchedForRef.current = deepLinkAchievementId;
    void data.loadAchievements();
  }, [deepLinkAchievementId, data.loadAchievements, pathname, userId]);

  useEffect(() => {
    if (!deepLinkAchievementId) {
      lastDeepLinkedIdRef.current = null;
      return;
    }
    if (pathname !== userCollection(userId)) return;
    if (data.isLoading) return;
    const exists = achievements.some((a) => a.id === deepLinkAchievementId);
    if (!exists) return;
    if (lastDeepLinkedIdRef.current === deepLinkAchievementId) return;
    lastDeepLinkedIdRef.current = deepLinkAchievementId;
    badgeMetrics.markDetailOpenStart(deepLinkAchievementId);
    ui.actions.openDetailView(deepLinkAchievementId);
  }, [
    achievements,
    badgeMetrics.markDetailOpenStart,
    data.isLoading,
    deepLinkAchievementId,
    pathname,
    ui.actions.openDetailView,
    userId,
  ]);

  const gridItems = useMemo(() => {
    const visible = hideLocked
      ? achievements.filter((a) => !a.is_locked)
      : achievements;
    return visible.map(achievementToGridItem);
  }, [achievements, hideLocked]);

  const unlockedCount = useMemo(
    () => achievements.filter((a) => !a.is_locked).length,
    [achievements],
  );
  const totalCount = achievements.length;

  const handleCancelPanelEdit = useCallback(() => {
    if (!detailAchievement) return;
    if (isAchievementFormDirty(panelForm, detailAchievement)) {
      ui.actions.requestDiscardEdit("back");
      return;
    }
    editorPipeline.actions.cancelPanelEdit();
  }, [detailAchievement, editorPipeline.actions, panelForm, ui.actions]);

  const handleCloseDetailPanel = useCallback(() => {
    if (
      ui.detailMode === "edit" &&
      detailAchievement &&
      isAchievementFormDirty(panelForm, detailAchievement)
    ) {
      ui.actions.requestDiscardEdit("close");
      return;
    }
    editorPipeline.actions.closeDetailPanel();
  }, [
    detailAchievement,
    editorPipeline.actions,
    panelForm,
    ui.actions,
    ui.detailMode,
  ]);

  const handleConfirmDiscardPanelEdit = useCallback(() => {
    const intent = ui.discardEditIntent;
    ui.actions.clearDiscardEdit();
    if (intent === "close") {
      editorPipeline.actions.closeDetailPanel();
      return;
    }
    editorPipeline.actions.cancelPanelEdit();
  }, [editorPipeline.actions, ui.actions, ui.discardEditIntent]);

  const dialogStackProps: AchievementDialogStackProps = {
    readOnly,
    editorUploadInProgress: badgeSession.editorUploadInProgress,
    closeDetailPanel: handleCloseDetailPanel,
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
    onCancelPanelEdit: handleCancelPanelEdit,
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
    handleConfirmDiscardPanelEdit,
    detailIsUnlocking,
    detailIsLockedUi,
    detailFloating,
    optimisticUnlockedAchievementId,
    unlockRevealClipPath,
    unlockAlphaMaskRef,
    startUnlockHold,
    cancelUnlockHold,
    achievementOverlayOpen,
    hideLocked,
    setHideLocked,
    unlockedCount,
    totalCount,
  };
}
