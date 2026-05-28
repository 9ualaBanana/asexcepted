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
  achievementHasCustomBadge,
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
import { useAchievementShareInviteController } from "@/components/achievements/use-achievement-share-invite-controller";
import {
  canDedicateAchievementViaShareInvite,
  getAchievementShareReadinessError,
} from "@/lib/share-invites/eligibility";
import { showErrorToast } from "@/lib/toast";
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
import { showsDedicatedBadgeEffect } from "@/lib/achievements/dedication-utils";
import { markTutorialCompleted } from "@/lib/tutorials/completed-store";
import { TUTORIAL_IDS } from "@/lib/tutorials/registry";
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
  isAdmin: boolean;
  canDedicate: boolean;
  initialDetailAchievementId?: string | null;
};

export function useAchievementsManagerModel({
  userId,
  readOnly,
  isAdmin,
  canDedicate,
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
  const [dedicateInviteConfirmOpen, setDedicateInviteConfirmOpen] = useState(false);
  const [dedicationBySenderName, setDedicationBySenderName] = useState<string | null>(
    null,
  );
  const [dedicationSenderNameLoading, setDedicationSenderNameLoading] = useState(false);

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
    detailAchievement && showsDedicatedBadgeEffect(detailAchievement),
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
  const detailRenderSrc = useMemo(() => {
    const src = detailAchievement?.icon_url?.trim() ?? "";
    if (!src) return "";
    return toOptimizedBadgeRenderSrc(src);
  }, [detailAchievement?.icon_url]);

  const [showBadgeSpinAfterFirstUnlock, setShowBadgeSpinAfterFirstUnlock] =
    useState(false);

  const handleFirstUnlockComplete = useCallback(() => {
    if (detailAchievement && achievementHasCustomBadge(detailAchievement)) {
      setShowBadgeSpinAfterFirstUnlock(true);
      return;
    }
    markTutorialCompleted(TUTORIAL_IDS.badgeSpin);
  }, [detailAchievement]);

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
    refreshUnlockAlphaMask,
  } = useAchievementUnlockReveal({
    readOnly,
    detailAchievement,
    detailRenderSrc,
    detailViewSessionKey: ui.detailViewSessionKey,
    isSaving,
    setIsSaving,
    setError,
    setAchievements,
    supabase,
    onFirstUnlockComplete: handleFirstUnlockComplete,
    onFirstUnlockReverted: () => {
      setShowBadgeSpinAfterFirstUnlock(false);
    },
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
  const loadAchievements = data.loadAchievements;
  const shareInvite = useAchievementShareInviteController({
    detailAchievementId: detailAchievement?.id ?? null,
    detailTitle: detailAchievement?.title,
    detailDescription: detailAchievement?.description,
    onDedicateInviteShared: () => {
      if (ui.detailAchievementId) {
        ui.actions.closeOverlay();
      }
      void loadAchievements({ silent: true });
    },
  });
  const embedLink = useAchievementEmbedLinkController({
    detailAchievementId: detailAchievement?.id ?? null,
  });
  const achievementsLoading = data.isLoading;
  const markDetailOpenStart = badgeMetrics.markDetailOpenStart;
  const openDetailView = ui.actions.openDetailView;

  const handleDetailBadgeImageDecoded = useCallback(() => {
    badgeMetrics.handleDetailBadgeImageDecoded();
    refreshUnlockAlphaMask();
  }, [badgeMetrics.handleDetailBadgeImageDecoded, refreshUnlockAlphaMask]);

  const collectionAchievementIds = useMemo(
    () => new Set(achievements.map((a) => a.id)),
    [achievements],
  );

  const dedicationQueue = useDedicationQueueController({
    ownerUserId: userId,
    readOnly,
    collectionAchievementIds,
    onAccepted: (record) => {
      setAchievements((prev) => {
        const rest = prev.filter((achievement) => achievement.id !== record.id);
        return sortAchievements([record, ...rest]);
      });
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
    void loadAchievements();
  }, [deepLinkAchievementId, loadAchievements, pathname, userId]);

  useEffect(() => {
    const senderId = detailAchievement?.dedicated_by_user_id;
    if (!senderId) {
      setDedicationBySenderName(null);
      setDedicationSenderNameLoading(false);
      return;
    }
    setDedicationBySenderName(null);
    setDedicationSenderNameLoading(true);
    let cancelled = false;
    void fetchPublicUserDisplayName(supabase, senderId).then((result) => {
      if (cancelled) return;
      setDedicationSenderNameLoading(false);
      if (result.isOk() && result.value) {
        setDedicationBySenderName(result.value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [detailAchievement?.dedicated_by_user_id, supabase]);

  useEffect(() => {
    if (!detailAchievement || ui.isVisibilityOnlyEdit) return;
    if (!canEditDedicatedVisibility(detailAchievement)) return;
    setPanelForm(achievementToForm(detailAchievement));
  }, [detailAchievement, ui.isVisibilityOnlyEdit, setPanelForm]);

  useEffect(() => {
    resetUnlockWave();
    setIsSaving(false);
  }, [pathname, userId, resetUnlockWave]);

  useEffect(() => {
    if (!deepLinkAchievementId) {
      lastDeepLinkedIdRef.current = null;
      return;
    }
    if (pathname !== userCollection(userId)) return;
    if (achievementsLoading) return;
    const exists = achievements.some((a) => a.id === deepLinkAchievementId);
    if (!exists) return;
    const dedicationQuery = searchParams.get("dedication") === "1";
    if (dedicationQuery && !collectionAchievementIds.has(deepLinkAchievementId)) {
      return;
    }
    // Accepted but URL not cleaned yet — avoid detail + dedication dialog both mounting 3D viewers.
    if (dedicationQuery && collectionAchievementIds.has(deepLinkAchievementId)) {
      return;
    }
    if (lastDeepLinkedIdRef.current === deepLinkAchievementId) return;
    lastDeepLinkedIdRef.current = deepLinkAchievementId;
    markDetailOpenStart(deepLinkAchievementId);
    openDetailView(deepLinkAchievementId);
  }, [
    achievements,
    achievementsLoading,
    deepLinkAchievementId,
    markDetailOpenStart,
    openDetailView,
    pathname,
    userId,
    searchParams,
    collectionAchievementIds,
  ]);

  const handleConfirmDedicate = useCallback(async () => {
    if (!canDedicate) return;
    setIsSaving(true);
    setError(null);

    let formForDedicate = createForm;
    try {
      formForDedicate = await badgeSession.finalizeModelPoseForForm(createForm);
      setCreateForm(formForDedicate);
    } catch (finalizeError) {
      setError(
        finalizeError instanceof Error
          ? finalizeError.message
          : "Could not finalize 3D badge upload.",
      );
      setIsSaving(false);
      return;
    }

    const payload = formToPayload(formForDedicate);
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
    setError,
    setIsSaving,
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
    setShowBadgeSpinAfterFirstUnlock(false);
    editorPipeline.actions.closeDetailPanel();
  }, [
    detailAchievement,
    editorPipeline.actions,
    panelForm,
    ui.actions,
    ui.detailMode,
    ui.isVisibilityOnlyEdit,
  ]);

  const showDedicateShareOption = useMemo(
    () => (detailAchievement ? canDedicateAchievementViaShareInvite(detailAchievement) : false),
    [detailAchievement],
  );

  const shareReadinessError = useMemo(() => {
    if (!detailAchievement) return null;
    return getAchievementShareReadinessError(detailAchievement);
  }, [detailAchievement]);

  const dedicateShareDisabledReason = useMemo(() => {
    if (!showDedicateShareOption) return null;
    return shareReadinessError;
  }, [shareReadinessError, showDedicateShareOption]);

  const showcaseShareDisabledReason = shareReadinessError;

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
    createBadgeAssetSessionRef: badgeSession.createBadgeAssetSessionRef,
    onSubmitCreate: editorPipeline.actions.submitCreate,
    onCancelCreate: editorPipeline.actions.closeOverlayFlow,
    detailMode: ui.detailMode,
    isVisibilityOnlyEdit: ui.isVisibilityOnlyEdit,
    detailViewSessionKey: ui.detailViewSessionKey,
    detailAchievement,
    panelForm,
    setPanelForm,
    setPanelUploadInProgress: badgeSession.setPanelUploadInProgress,
    panelBadgeAssetSessionRef: badgeSession.panelBadgeAssetSessionRef,
    onSubmitPanelSave: editorPipeline.actions.submitPanelSave,
    onSubmitPanelVisibilitySave: editorPipeline.actions.submitPanelVisibilitySave,
    onCancelPanelEdit: handleCancelPanelEdit,
    onRequestPanelEdit: editorPipeline.actions.startPanelEditFlow,
    onRequestPanelVisibilityEdit: editorPipeline.actions.startPanelVisibilityEditFlow,
    detailIsUnlocking,
    detailIsLockedUi,
    detailRenderSrc,
    detailTone,
    DetailFallbackIcon,
    unlockRevealClipPath,
    detailMaskStyle,
    unlockAlphaMaskRef,
    startUnlockHold,
    cancelUnlockHold,
    onDetailBadgeImageDecoded: handleDetailBadgeImageDecoded,
    onDetailBadgeModelUrlReady: badgeMetrics.handleDetailBadgeModelUrlReady,
    onDetailBadgeVisualReady: badgeMetrics.handleDetailBadgeVisualReady,
    optimisticUnlockedAchievementId,
    isSaving,
    shareMenuBusy: shareInvite.shareInviteBusy || embedLink.embedCopyBusy,
    dedicateShareDisabledReason,
    showDedicateShareOption,
    showcaseShareDisabledReason,
    onShareShowcase: () => {
      if (showcaseShareDisabledReason) {
        showErrorToast(showcaseShareDisabledReason, { id: "achievement-showcase-not-ready" });
        return;
      }
      shareInvite.shareShowcaseAchievement();
    },
    onRequestDedicateInviteShare: () => {
      if (!showDedicateShareOption) return;
      if (dedicateShareDisabledReason) {
        showErrorToast(dedicateShareDisabledReason, { id: "achievement-dedicate-not-ready" });
        return;
      }
      setDedicateInviteConfirmOpen(true);
    },
    onEmbedLink: () => void embedLink.copyEmbedLink(),
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
    dedicationSenderNameLoading,
    isDedicatingCreate,
    badgeSessionController: badgeSession,
    showBadgeSpinAfterFirstUnlock,
    setShowBadgeSpinAfterFirstUnlock,
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
    shareInvite,
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
    dedicateInviteConfirmOpen,
    setDedicateInviteConfirmOpen,
    handleConfirmDedicateInviteShare: () => {
      if (!showDedicateShareOption) {
        setDedicateInviteConfirmOpen(false);
        return;
      }
      if (dedicateShareDisabledReason) {
        showErrorToast(dedicateShareDisabledReason, { id: "achievement-dedicate-not-ready" });
        setDedicateInviteConfirmOpen(false);
        return;
      }
      setDedicateInviteConfirmOpen(false);
      shareInvite.shareDedicationInvite();
    },
  };
}
