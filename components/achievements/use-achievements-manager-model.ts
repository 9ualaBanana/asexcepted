"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  createInitialForm,
  sortAchievements,
} from "@/components/achievements/achievement-manager-utils";
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
import { useVisibilityFilterPreference } from "@/lib/achievements/visibility-filter-preference";
import {
  canEditDedicatedVisibility,
  isDedicatedVisibilityDirty,
} from "@/lib/achievements/dedication-utils";
import { userCollection } from "@/lib/routes";
import { IMPRESSION_GLITTER_UI_ENABLED } from "@/lib/achievements/impression-glitter-feature";
import { showsDedicatedBadgeAura } from "@/lib/achievements/dedication-utils";
import { useDedicationQueueController } from "@/components/achievements/dedication/use-dedication-queue-controller";
import {
  achievementToForm,
  formToPayload,
} from "@/components/achievements/achievement-transformers";
import {
  payloadToDedicateApiBody,
  postDedicateAchievement,
} from "@/lib/dedications/dedicate-achievement-api";
import { fetchPublicUserDisplayName } from "@/lib/user-profile-db";
import { createClient } from "@/lib/supabase/client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UseAchievementsManagerModelArgs = {
  userId: string;
  readOnly: boolean;
  isAdmin?: boolean;
  canDedicate?: boolean;
  initialDetailAchievementId?: string | null;
};

export function useAchievementsManagerModel({
  userId,
  readOnly,
  isAdmin = false,
  canDedicate = false,
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
  const [impressionGlitterRevealPulse, setImpressionGlitterRevealPulse] = useState(0);
  const [optimisticImpressionGlitter, setOptimisticImpressionGlitter] = useState(false);
  const [isDedicatingCreate, setIsDedicatingCreate] = useState(false);
  const [dedicationSenderConfirmOpen, setDedicationSenderConfirmOpen] = useState(false);
  const [dedicationBySenderName, setDedicationBySenderName] = useState<string | null>(null);

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

  useEffect(() => {
    setOptimisticImpressionGlitter(false);
    setImpressionGlitterRevealPulse(0);
  }, [detailAchievement?.id]);

  const detailShowsImpressionGlitter =
    IMPRESSION_GLITTER_UI_ENABLED &&
    Boolean(
      detailAchievement &&
        ((detailAchievement.impression_count ?? 0) > 0 ||
          optimisticImpressionGlitter),
    );

  const detailShowsDedicatedGlitter = Boolean(
    detailAchievement && showsDedicatedBadgeAura(detailAchievement),
  );

  const bumpDetailImpressionCount = useCallback(() => {
    if (!detailAchievement) return;
    setAchievements((prev) =>
      prev.map((achievement) =>
        achievement.id === detailAchievement.id
          ? {
              ...achievement,
              impression_count: (achievement.impression_count ?? 0) + 1,
            }
          : achievement,
      ),
    );
  }, [detailAchievement, setAchievements]);
  const badgeMetrics = useAchievementBadgeMetricsController(detailAchievement, isAdmin);
  const [hideLocked, setHideLocked] = useHideLockedPreference();
  const { visibilityFilter, cycleVisibilityFilter } = useVisibilityFilterPreference();
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
    canDedicate,
    isDedicatingCreate,
    setIsDedicatingCreate,
    onRequestDedicateConfirm: () => setDedicationSenderConfirmOpen(true),
    isCreating: ui.isCreating,
    detailMode: ui.detailMode,
    isVisibilityOnlyEdit: ui.isVisibilityOnlyEdit,
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

  const collectionAchievementIds = useMemo(
    () => new Set(achievements.map((a) => a.id)),
    [achievements],
  );

  const dedicationQueue = useDedicationQueueController({
    ownerUserId: userId,
    readOnly,
    collectionAchievementIds,
    onAccepted: (record) => {
      setAchievements((prev) => sortAchievements([record, ...prev]));
    },
    onRejected: () => undefined,
    reloadAchievements: data.loadAchievements,
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
    if (!detailAchievement?.dedicated_by_user_id) {
      setDedicationBySenderName(null);
      return;
    }
    void fetchPublicUserDisplayName(supabase, detailAchievement.dedicated_by_user_id).then(
      (result) => {
        if (result.isOk() && result.value) {
          setDedicationBySenderName(result.value);
        }
      },
    );
  }, [detailAchievement?.dedicated_by_user_id, supabase]);

  useEffect(() => {
    if (!detailAchievement || ui.isVisibilityOnlyEdit) return;
    if (!canEditDedicatedVisibility(detailAchievement)) return;
    setPanelForm(achievementToForm(detailAchievement));
  }, [detailAchievement, ui.isVisibilityOnlyEdit, setPanelForm]);

  useEffect(() => {
    if (!deepLinkAchievementId) {
      lastDeepLinkedIdRef.current = null;
      return;
    }
    if (pathname !== userCollection(userId)) return;
    if (data.isLoading) return;
    const exists = achievements.some((a) => a.id === deepLinkAchievementId);
    if (!exists) return;
    if (
      searchParams.get("dedication") === "1" &&
      !collectionAchievementIds.has(deepLinkAchievementId)
    ) {
      return;
    }
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
    searchParams,
    collectionAchievementIds,
  ]);

  const handleConfirmDedicate = useCallback(async () => {
    if (!canDedicate) return;
    setIsSaving(true);
    setError(null);
    const payload = formToPayload(createForm);
    const body = payloadToDedicateApiBody(userId, payload);
    const result = await postDedicateAchievement(body);
    if (result.isErr()) {
      setError(result.error);
      setIsSaving(false);
      return;
    }
    playSavePop();
    setCreateForm(createInitialForm());
    setIsDedicatingCreate(false);
    setDedicationSenderConfirmOpen(false);
    badgeSession.beginCreateBadgeSession();
    setIsSaving(false);
    ui.actions.closeOverlay();
  }, [
    badgeSession,
    canDedicate,
    createForm,
    playSavePop,
    setCreateForm,
    ui.actions,
    userId,
  ]);

  const gridItems = useMemo(() => {
    let visible = achievements;
    if (hideLocked) {
      visible = visible.filter((a) => !a.is_locked);
    }
    if (!readOnly) {
      if (visibilityFilter === "public") {
        visible = visible.filter((a) => a.visibility === "public");
      } else if (visibilityFilter === "private") {
        visible = visible.filter((a) => a.visibility === "private");
      }
    }
    return visible.map(achievementToGridItem);
  }, [achievements, hideLocked, readOnly, visibilityFilter]);

  const unlockedCount = useMemo(
    () => achievements.filter((a) => !a.is_locked).length,
    [achievements],
  );
  const totalCount = achievements.length;

  const handleCancelPanelEdit = useCallback(() => {
    if (!detailAchievement) return;
    const dirty = ui.isVisibilityOnlyEdit
      ? isDedicatedVisibilityDirty(panelForm, detailAchievement)
      : isAchievementFormDirty(panelForm, detailAchievement);
    if (dirty) {
      ui.actions.requestDiscardEdit("back");
      return;
    }
    editorPipeline.actions.cancelPanelEdit();
  }, [
    detailAchievement,
    editorPipeline.actions,
    panelForm,
    ui.actions,
    ui.isVisibilityOnlyEdit,
  ]);

  const handleCloseDetailPanel = useCallback(() => {
    if (ui.detailMode === "edit" && detailAchievement) {
      const dirty = ui.isVisibilityOnlyEdit
        ? isDedicatedVisibilityDirty(panelForm, detailAchievement)
        : isAchievementFormDirty(panelForm, detailAchievement);
      if (dirty) {
        ui.actions.requestDiscardEdit("close");
        return;
      }
    }
    editorPipeline.actions.closeDetailPanel();
  }, [
    detailAchievement,
    editorPipeline.actions,
    panelForm,
    ui.actions,
    ui.detailMode,
    ui.isVisibilityOnlyEdit,
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
    isVisibilityOnlyEdit: ui.isVisibilityOnlyEdit,
    detailAchievement,
    panelForm,
    setPanelForm,
    setPanelUploadInProgress: badgeSession.setPanelUploadInProgress,
    panelBadgeIkSessionRef: badgeSession.panelBadgeIkSessionRef,
    onSubmitPanelSave: editorPipeline.actions.submitPanelSave,
    onSubmitPanelVisibilitySave: editorPipeline.actions.submitPanelVisibilitySave,
    onCancelPanelEdit: handleCancelPanelEdit,
    onRequestPanelEdit: editorPipeline.actions.startPanelEditFlow,
    onRequestPanelVisibilityEdit: editorPipeline.actions.startPanelVisibilityEditFlow,
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
    detailShowsImpressionGlitter,
    dedicatedBadgeGlitter: detailShowsDedicatedGlitter,
    impressionGlitterRevealPulse,
    onImpressionGlitterReveal: () => {
      setOptimisticImpressionGlitter(true);
      setImpressionGlitterRevealPulse((pulse) => pulse + 1);
    },
    onImpressionRecorded: (added: boolean, hadImpressionsBefore: boolean) => {
      if (added) {
        bumpDetailImpressionCount();
        return;
      }
      if (!hadImpressionsBefore) {
        setOptimisticImpressionGlitter(false);
      }
    },
    dedicationSenderDisplayName: dedicationBySenderName,
    isDedicatingCreate,
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
    visibilityFilter,
    cycleVisibilityFilter,
    unlockedCount,
    totalCount,
    canDedicate,
    dedicationQueue,
    dedicationSenderConfirmOpen,
    setDedicationSenderConfirmOpen,
    handleConfirmDedicate,
  };
}
