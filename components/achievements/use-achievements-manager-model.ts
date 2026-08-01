"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { createInitialForm } from "@/components/achievements/achievement-manager-utils";
import { type FormState } from "@/components/achievements/achievement-editor-shared";
import type { AchievementDialogStackProps } from "@/components/achievements/detail/achievement-dialog-stack";
import {
  achievementDetailToForm,
  detailToShareInviteSnapshotSource,
  isAchievementFormDirty,
  mapCollectionDetails,
  upsertCollectionEntry,
  type AchievementCollectionEntryViewModel,
} from "@/lib/achievements/data/achievement-view-models";
import { useBadgeChunkedPrewarm, useBadgeMetricsController, useBadgeSessionController } from "@/components/achievements/badge";
import { useAchievementUnlockReveal } from "@/components/achievements/badge/effects/use-achievement-unlock-reveal";
import { useAchievementEditorPipelineController } from "@/components/achievements/badge/editor/use-achievement-editor-pipeline-controller";
import { useAchievementDetailViewModel } from "@/components/achievements/detail/use-achievement-detail-view-model";
import { useAchievementDataController } from "@/components/achievements/hooks/use-achievement-data-controller";
import { useAchievementDetailSelectionController } from "@/components/achievements/hooks/use-achievement-detail-selection-controller";
import { useAchievementEmbedLinkController } from "@/components/achievements/share/use-achievement-embed-link-controller";
import { useAchievementShareInviteController } from "@/components/achievements/share/use-achievement-share-invite-controller";
import {
  canDedicateAchievementViaShareInvite,
  getAchievementShareReadinessError,
} from "@/lib/share-invites/eligibility";
import { showErrorToast } from "@/lib/toast";
import { useAchievementUiStateMachine } from "@/components/achievements/hooks/use-achievement-ui-state-machine";
import {
  markTutorialCompleted,
  resetHideLockedPreferenceForNewAccount,
  useHideLockedPreference,
  useVisibilityFilterPreference,
} from "@/lib/local-storage";
import {
  canEditDedicatedVisibility,
  isDedicatedVisibilityDirty,
} from "@/lib/achievements/dedication/dedication-utils";
import { userCollection } from "@/lib/routes";
import { TUTORIAL_IDS } from "@/lib/tutorials/registry";
import { useDedicationQueueController } from "@/components/achievements/dedication/use-dedication-queue-controller";
import { formToPayload } from "@/lib/achievements/data/achievement-view-models";
import {
  payloadToDedicateApiBody,
  postDedicateAchievement,
} from "@/lib/achievements/client/dedicate-api";
import { normalizeNetworkFailureMessage } from "@/lib/client/fetch-json";
import {
  buildAchievementAbility,
  getAchievementPermissions,
  type AchievementAuthContext,
} from "@/lib/auth/achievement-ability";
import { fetchPublicUserDisplayName } from "@/lib/achievements/data/user-profile-db";
import { createClient } from "@/lib/supabase/client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UseAchievementsManagerModelArgs = {
  userId: string;
  auth: AchievementAuthContext;
  initialDetailAchievementId?: string | null;
};

export function useAchievementsManagerModel({
  userId,
  auth,
  initialDetailAchievementId,
}: UseAchievementsManagerModelArgs) {
  const ability = useMemo(
    () => buildAchievementAbility(auth),
    [auth.readOnly, auth.isAdmin, auth.canDedicate],
  );
  const {
    canEditAchievements,
    canFilterVisibility,
    canDedicateAchievements,
    canUnlockViaHold,
    canToggleBadgeLock,
    canViewBadgeDebugMetrics,
  } = useMemo(() => getAchievementPermissions(ability), [ability]);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [achievements, setAchievements] = useState<AchievementCollectionEntryViewModel[]>([]);
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
  const badgeSession = useBadgeSessionController({
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
    process.env.NEXT_PUBLIC_IMPRESSION_GLITTER_UI_ENABLED === "true" &&
    Boolean(
      detailAchievement &&
        (detailAchievement.impressionCount > 0 || optimisticImpressionGlitter),
    );

  const detailShowsDedicatedGlitter = Boolean(detailAchievement?.showDedicatedGlitter);

  const bumpDetailImpressionCount = useCallback(() => {
    if (!detailAchievement) return;
    setAchievements((prev) =>
      mapCollectionDetails(prev, (detail) =>
        detail.id === detailAchievement.id
          ? { ...detail, impressionCount: detail.impressionCount + 1 }
          : detail,
      ),
    );
  }, [detailAchievement, setAchievements]);
  const badgeMetrics = useBadgeMetricsController(
    detailAchievement,
    canViewBadgeDebugMetrics,
  );
  const [hideLocked, setHideLocked] = useHideLockedPreference();
  const { visibilityFilter, cycleVisibilityFilter } = useVisibilityFilterPreference();
  const detailRenderSrc = detailAchievement?.renderSrc ?? null;

  const [showBadgeSpinAfterFirstUnlock, setShowBadgeSpinAfterFirstUnlock] =
    useState(false);

  const handleFirstUnlockComplete = useCallback(() => {
    if (detailAchievement?.hasCustomBadge) {
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
    unlockRevealClipPathRef,
    unlockAlphaMaskRef,
    cancelUnlockHold,
    startUnlockHold,
    resetUnlockWave,
    refreshUnlockAlphaMask,
  } = useAchievementUnlockReveal({
    readOnly: !canUnlockViaHold,
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
    readOnly: !canEditAchievements,
  });

  const editorPipeline = useAchievementEditorPipelineController({
    readOnly: !canEditAchievements,
    canDedicate: canDedicateAchievements,
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
    readOnly: !canEditAchievements,
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
    () => new Set(achievements.map((entry) => entry.detail.id)),
    [achievements],
  );

  const dedicationQueue = useDedicationQueueController({
    ownerUserId: userId,
    readOnly: !canEditAchievements,
    collectionAchievementIds,
    onAccepted: (detail) => {
      setAchievements((prev) => upsertCollectionEntry(prev, detail));
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
    if (!canEditAchievements || onboardingHandledRef.current) return;
    if (searchParams.get("onboarding") !== "1") return;
    onboardingHandledRef.current = true;
    resetHideLockedPreferenceForNewAccount();
    setHideLocked(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("onboarding");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [canEditAchievements, pathname, router, searchParams, setHideLocked]);

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
    const senderId = detailAchievement?.dedicatedByUserId;
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
  }, [detailAchievement?.dedicatedByUserId, supabase]);

  useEffect(() => {
    if (!detailAchievement || ui.isVisibilityOnlyEdit) return;
    if (!canEditDedicatedVisibility(detailAchievement)) return;
    setPanelForm(achievementDetailToForm(detailAchievement));
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
    const exists = achievements.some((entry) => entry.detail.id === deepLinkAchievementId);
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
    if (!canDedicateAchievements) return;
    setIsSaving(true);
    setError(null);

    let formForDedicate = createForm;
    try {
      formForDedicate = await badgeSession.finalizeModelPoseForForm(createForm);
      if (formForDedicate !== createForm) {
        setCreateForm(formForDedicate);
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
    canDedicateAchievements,
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
      visible = visible.filter((entry) => !entry.detail.isLocked);
    }
    if (canFilterVisibility) {
      if (visibilityFilter === "public") {
        visible = visible.filter((entry) => entry.detail.visibility === "public");
      } else if (visibilityFilter === "private") {
        visible = visible.filter((entry) => entry.detail.visibility === "private");
      }
    }
    return visible.map((entry) => entry.grid);
  }, [achievements, canFilterVisibility, hideLocked, visibilityFilter]);

  const unlockedCount = useMemo(
    () => achievements.filter((entry) => !entry.detail.isLocked).length,
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
    return getAchievementShareReadinessError(detailToShareInviteSnapshotSource(detailAchievement));
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
    readOnly: !canEditAchievements,
    isAdmin: canToggleBadgeLock,
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
    unlockRevealClipPathRef,
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
    readOnly: !canEditAchievements,
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
    unlockRevealClipPathRef,
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
    canDedicate: canDedicateAchievements,
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
