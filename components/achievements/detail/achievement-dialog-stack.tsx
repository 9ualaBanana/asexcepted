"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { Check, Loader2, PenLine, X, type LucideIcon } from "lucide-react";

import type { AchievementTone } from "@/components/achievements/achievement-manager-utils";
import {
  Badge,
  BadgeAttributionPopover,
  badgeOptionsForDetailInteractive,
  submitImpression,
  type BadgeSessionController,
} from "@/components/achievements/badge";
import { LockedBadgeRefuseHitLayer } from "@/components/achievements/badge/effects/locked-badge-refuse-hit-layer";
import { useLockedBadgeRefuseMotion } from "@/components/achievements/badge/effects/use-locked-badge-refuse-motion";
import { useUnlockedBadgePokeMotion } from "@/components/achievements/badge/effects/use-unlocked-badge-poke-motion";
import type { AlphaMaskData } from "@/lib/achievements/badge/parallax/shape-utils";
import {
  badgeChromeWidth,
  achievementDialogChromeInset,
  achievementDialogIconBtn,
  achievementDialogIconSideSlot,
  type RemoteAssetStorageSession,
  formatAchievedAt,
  type FormState,
} from "@/components/achievements/achievement-editor-shared";
import { DedicationByline } from "@/components/achievements/dedication/dedication-byline";
import { DedicationBylineChromeRow } from "@/components/achievements/dedication/dedication-byline-chrome-row";
import { AchievementDetailShareMenu } from "@/components/achievements/share/achievement-detail-share-menu";
import { EditableAchievementCard } from "@/components/achievements/detail/editable-achievement-card";
import { AchievementOverlayTransitionFlyer } from "@/components/achievements/detail/achievement-overlay-transition-flyer";
import { useOverlayTransitionPresentation } from "@/components/achievements/detail/use-overlay-transition-presentation";
import { AchievementVisibilityToggle } from "@/components/achievements/detail/achievement-visibility-toggle";
import {
  canEditDedicatedVisibility,
  isDedicatedAchievement,
} from "@/lib/achievements/dedication/dedication-utils";
import {
  type AchievementDetailViewModel,
} from "@/lib/achievements/data/achievement-view-models";
import type { OverlayTransitionSession } from "@/lib/achievements/ui/overlay-transition";
import { useBodyScrollLock } from "@/lib/dom/body-scroll-lock";
import { getTutorial, TUTORIAL_IDS, useTutorial, useTutorialToast } from "@/lib/tutorials";
import { cn } from "@/lib/utils";

export type AchievementDialogStackProps = {
  readOnly: boolean;
  isAdmin: boolean;
  editorUploadInProgress: boolean;
  closeDetailPanel: () => void;

  isCreating: boolean;
  createForm: FormState;
  setCreateForm: Dispatch<SetStateAction<FormState>>;
  setCreateUploadInProgress: (inProgress: boolean) => void;
  createBadgeAssetSessionRef: RefObject<RemoteAssetStorageSession>;
  onSubmitCreate: (e: FormEvent) => void | Promise<void>;
  onCancelCreate: () => void;

  detailMode: "view" | "edit";
  isVisibilityOnlyEdit?: boolean;
  detailViewSessionKey: number;
  overlayTransition: OverlayTransitionSession;
  detailAchievement: AchievementDetailViewModel | null;
  panelForm: FormState;
  setPanelForm: Dispatch<SetStateAction<FormState>>;
  setPanelUploadInProgress: (inProgress: boolean) => void;
  panelBadgeAssetSessionRef: RefObject<RemoteAssetStorageSession>;
  onSubmitPanelSave: (e: FormEvent) => void | Promise<void>;
  onSubmitPanelVisibilitySave: () => void | Promise<void>;
  onCancelPanelEdit: () => void;
  onRequestPanelEdit: () => void;
  onRequestPanelVisibilityEdit: () => void;

  detailIsUnlocking: boolean;
  isUnlockHolding: boolean;
  detailIsLockedUi: boolean;
  detailRenderSrc: string | null;
  detailTone: AchievementTone;
  DetailFallbackIcon: LucideIcon;
  unlockRevealClipPathRef: RefObject<string>;
  detailMaskStyle: CSSProperties | null;
  unlockAlphaMaskRef: RefObject<AlphaMaskData | null>;
  startUnlockHold: () => void;
  cancelUnlockHold: () => void;
  onDetailBadgeImageDecoded: () => void;
  onDetailBadgeModelUrlReady: () => void;
  onDetailBadgeVisualReady: () => void;
  optimisticUnlockedAchievementId: string | null;

  isSaving: boolean;
  shareMenuBusy: boolean;
  dedicateShareDisabledReason?: string | null;
  showcaseShareDisabledReason?: string | null;
  showDedicateShareOption?: boolean;
  onShareShowcase: () => void;
  onRequestDedicateInviteShare: () => void;
  onEmbedLink: () => void;
  onRequestDelete: (achievementId: string) => void;
  onImpressionRecorded: (added: boolean) => void;
  dedicationSenderDisplayName?: string | null;
  dedicationSenderNameLoading?: boolean;
  isDedicatingCreate?: boolean;
  badgeSessionController: BadgeSessionController;
  showBadgeSpinAfterFirstUnlock?: boolean;
  setShowBadgeSpinAfterFirstUnlock?: (show: boolean) => void;
};

export function AchievementDialogStack(props: AchievementDialogStackProps) {
  const {
    readOnly,
    isAdmin,
    editorUploadInProgress,
    closeDetailPanel,
    isCreating,
    createForm,
    setCreateForm,
    setCreateUploadInProgress,
    createBadgeAssetSessionRef,
    onSubmitCreate,
    onCancelCreate,
    detailMode,
    isVisibilityOnlyEdit = false,
    detailViewSessionKey,
    overlayTransition,
    detailAchievement,
    panelForm,
    setPanelForm,
    setPanelUploadInProgress,
    panelBadgeAssetSessionRef,
    onSubmitPanelSave,
    onSubmitPanelVisibilitySave,
    onCancelPanelEdit,
    onRequestPanelEdit,
    onRequestPanelVisibilityEdit,
    detailIsUnlocking,
    isUnlockHolding,
    detailIsLockedUi,
    detailRenderSrc,
    detailTone,
    DetailFallbackIcon,
    unlockRevealClipPathRef,
    detailMaskStyle,
    unlockAlphaMaskRef,
    startUnlockHold,
    cancelUnlockHold,
    onDetailBadgeImageDecoded,
    onDetailBadgeModelUrlReady,
    onDetailBadgeVisualReady,
    optimisticUnlockedAchievementId,
    isSaving,
    shareMenuBusy,
    dedicateShareDisabledReason = null,
    showcaseShareDisabledReason = null,
    showDedicateShareOption = true,
    onShareShowcase,
    onRequestDedicateInviteShare,
    onEmbedLink,
    onRequestDelete,
    onImpressionRecorded,
    dedicationSenderDisplayName,
    dedicationSenderNameLoading = false,
    isDedicatingCreate = false,
    badgeSessionController,
    showBadgeSpinAfterFirstUnlock = false,
    setShowBadgeSpinAfterFirstUnlock,
  } = props;

  const transitionUi = useOverlayTransitionPresentation(overlayTransition);

  const detailIsDedicated =
    detailAchievement != null && isDedicatedAchievement(detailAchievement);
  const dedicatedVisibilityEditable =
    detailAchievement != null && canEditDedicatedVisibility(detailAchievement);
  const dedicationSenderId = detailAchievement?.dedicatedByUserId ?? null;
  const showDetailContent =
    detailAchievement != null &&
    (detailMode === "view" || isVisibilityOnlyEdit);
  const badgeGestureSurface = useMemo(
    () => ({
      detailMode,
      locked: detailIsLockedUi,
      unlocking: detailIsUnlocking,
      present: detailAchievement != null,
      readOnly,
    }),
    [
      detailAchievement,
      detailIsLockedUi,
      detailIsUnlocking,
      detailMode,
      readOnly,
    ],
  );
  const lockedRefuse = useLockedBadgeRefuseMotion(badgeGestureSurface);
  const unlockedPoke = useUnlockedBadgePokeMotion(badgeGestureSurface);
  const unlockHoldSessionRef = useRef(false);

  useEffect(() => {
    if (detailIsUnlocking || !lockedRefuse.armed) {
      unlockHoldSessionRef.current = false;
    }
  }, [detailIsUnlocking, lockedRefuse.armed]);

  const impressionTutorial = useTutorial(TUTORIAL_IDS.impressionDoubleTap);
  const unlockHoldTutorial = useTutorial(TUTORIAL_IDS.unlockHold);
  const badgeSpinTutorial = useTutorial(TUTORIAL_IDS.badgeSpin);
  const impressionTutorialDefinition = getTutorial(TUTORIAL_IDS.impressionDoubleTap);
  const unlockHoldTutorialDefinition = getTutorial(TUTORIAL_IDS.unlockHold);
  const badgeSpinTutorialDefinition = getTutorial(TUTORIAL_IDS.badgeSpin);
  const detailHasCustomBadge =
    detailAchievement != null && detailAchievement.hasCustomBadge;
  useTutorialToast({
    tutorial: impressionTutorialDefinition,
    active: readOnly && !detailIsLockedUi && impressionTutorial.active,
    onDismiss: impressionTutorial.dismiss,
  });

  useTutorialToast({
    tutorial: unlockHoldTutorialDefinition,
    active:
      unlockHoldTutorial.active &&
      !readOnly &&
      detailIsLockedUi &&
      !detailIsUnlocking &&
      detailMode === "view" &&
      detailAchievement != null,
    onDismiss: unlockHoldTutorial.dismiss,
  });

  const dismissBadgeSpinTutorial = useCallback(() => {
    badgeSpinTutorial.dismiss();
    setShowBadgeSpinAfterFirstUnlock?.(false);
  }, [badgeSpinTutorial, setShowBadgeSpinAfterFirstUnlock]);

  useTutorialToast({
    tutorial: badgeSpinTutorialDefinition,
    active:
      badgeSpinTutorial.active &&
      showBadgeSpinAfterFirstUnlock &&
      detailHasCustomBadge &&
      !readOnly &&
      !detailIsLockedUi &&
      !detailIsUnlocking &&
      detailMode === "view" &&
      detailAchievement != null,
    onDismiss: dismissBadgeSpinTutorial,
  });

  const handleUnlockPointerDown = useCallback(() => {
    unlockHoldSessionRef.current = true;
    startUnlockHold();
  }, [startUnlockHold]);

  const handleUnlockPointerEnd = useCallback(() => {
    const shortPress = unlockHoldSessionRef.current && isUnlockHolding;
    unlockHoldSessionRef.current = false;
    cancelUnlockHold();
    if (shortPress) {
      lockedRefuse.trigger();
    }
  }, [cancelUnlockHold, isUnlockHolding, lockedRefuse]);

  const handleLeaveImpression = useCallback(() => {
    if (
      !detailAchievement ||
      !readOnly ||
      detailIsUnlocking ||
      detailIsLockedUi
    ) {
      return;
    }

    impressionTutorial.dismiss();

    void submitImpression(detailAchievement.id).then((result) => {
      if (result.ok) {
        impressionTutorial.dismiss();
      }
      onImpressionRecorded(result.added);
    });
  }, [
    detailAchievement,
    detailIsLockedUi,
    detailIsUnlocking,
    impressionTutorial,
    onImpressionRecorded,
    readOnly,
  ]);

  useBodyScrollLock();

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-detail-title"
      className="fixed inset-0 z-[200] flex min-h-0 w-full min-w-0 flex-col overscroll-contain min-h-screen min-h-[100dvh]"
    >
      {transitionUi.flyer ? (
        <AchievementOverlayTransitionFlyer {...transitionUi.flyer} />
      ) : null}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 z-0 bg-black/[65.5%] backdrop-blur-sm transition-opacity ease-out",
          transitionUi.chrome.opaque ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${transitionUi.chrome.durationMs}ms` }}
        onClick={() => {
          if (editorUploadInProgress) return;
          if (!transitionUi.isInteractive) return;
          closeDetailPanel();
        }}
      />
      <div
        className={cn(
          "pointer-events-none relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6 transition-opacity ease-out",
          transitionUi.chrome.opaque ? "opacity-100" : "opacity-0",
          !transitionUi.chrome.opaque && "pointer-events-none",
        )}
        style={{ transitionDuration: `${transitionUi.chrome.durationMs}ms` }}
      >
        <div
          className={cn(
            "pointer-events-auto relative mx-auto my-auto flex w-full max-w-lg max-h-[min(92dvh,56rem)] min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-3xl border border-white/12 bg-card p-4 pb-6 text-card-foreground sm:p-6 sm:pb-6",
            "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_0_rgba(255,255,255,0.08),inset_0_-1px_0_0_rgba(0,0,0,0.12),inset_1px_0_0_0_rgba(255,255,255,0.05),inset_-1px_0_0_0_rgba(255,255,255,0.05),inset_0_0_12px_rgba(0,0,0,0.1),0_4px_14px_-3px_rgba(0,0,0,0.24),0_16px_44px_-12px_rgba(0,0,0,0.32)]",
            "outline-none focus-visible:outline-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            (isCreating || detailMode === "edit") && "overflow-x-hidden",
            !transitionUi.chrome.opaque && "pointer-events-none",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {isCreating ? (
            <EditableAchievementCard
              form={createForm}
              setForm={setCreateForm}
              isSaving={isSaving}
              onSubmit={onSubmitCreate}
              onCancel={onCancelCreate}
              onUploadInProgressChange={setCreateUploadInProgress}
              badgeAssetSessionRef={createBadgeAssetSessionRef}
              onClosePanel={() => closeDetailPanel()}
              dedicateMode={isDedicatingCreate}
              canToggleLocked={isAdmin}
              badgeSessionController={badgeSessionController}
              badgeHost={transitionUi.badgeHost}
              isCreatingFlow
            />
          ) : showDetailContent ? (
            <div className="no-tap-highlight flex w-full flex-col items-center pt-1">
              <div className={badgeChromeWidth}>
                <div
                  className={cn(
                    "flex w-full items-center justify-end pb-1",
                    achievementDialogChromeInset,
                  )}
                >
                  <button
                    type="button"
                    aria-label="Close"
                    className={achievementDialogIconBtn}
                    onClick={() => {
                      if (editorUploadInProgress) return;
                      closeDetailPanel();
                    }}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="flex justify-center">
                  <div
                    ref={transitionUi.badgeHost.containerRef}
                    className={cn(
                      "relative",
                      transitionUi.badgeHost.hideBadge && "opacity-0",
                      lockedRefuse.className,
                      unlockedPoke.className,
                    )}
                    {...unlockedPoke.bind()}
                  >
                    <Badge
                      options={badgeOptionsForDetailInteractive({
                        renderSrc: detailRenderSrc,
                        motionSeed: detailAchievement.id,
                        tone: detailTone,
                        detail: detailAchievement,
                        viewerStateKey: `${detailAchievement.id}:detail:${detailViewSessionKey}`,
                        lockedUi: detailIsLockedUi,
                        unlocking: detailIsUnlocking,
                        motionStartCentered:
                          optimisticUnlockedAchievementId === detailAchievement.id,
                        detailMaskStyle: detailMaskStyle,
                        unlockRevealClipPathRef,
                        unlockAlphaMaskRef: unlockAlphaMaskRef,
                        enableUnlockHold: detailIsLockedUi && !readOnly,
                        onUnlockPointerDown: handleUnlockPointerDown,
                        onUnlockPointerEnd: handleUnlockPointerEnd,
                        onImageDecoded: onDetailBadgeImageDecoded,
                        onModelUrlReady: onDetailBadgeModelUrlReady,
                        onVisualReady: onDetailBadgeVisualReady,
                        dedicatedEffect:
                          detailAchievement.showDedicatedEffect,
                        impressionEffect: detailAchievement.impressionCount > 0,
                        impression: readOnly
                          ? {
                              burstEnabled: true,
                              activateDisabled:
                                detailIsUnlocking || detailIsLockedUi,
                              onActivate: handleLeaveImpression,
                            }
                          : undefined,
                      })}
                    />
                    <LockedBadgeRefuseHitLayer
                      enabled={lockedRefuse.showHitLayer}
                      onRefuse={lockedRefuse.trigger}
                      alphaMaskRef={unlockAlphaMaskRef}
                    />
                    {detailAchievement.model != null && (
                      <BadgeAttributionPopover
                        value={detailAchievement.model.ccAttribution ?? ""}
                        emptyState="No attribution was provided for this 3D badge."
                      />
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-8 w-full text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
                {detailAchievement.category?.trim() ||
                  (detailIsLockedUi ? "Locked" : "Uncategorized")}
              </p>
              <h2
                id="achievement-detail-title"
                className="mt-2 text-center text-xl font-semibold tracking-tight text-white"
              >
                {detailAchievement.title?.trim() ||
                  (detailIsLockedUi ? "Locked" : "Untitled")}
              </h2>
              <p className="mt-4 break-words text-center text-sm leading-relaxed text-white/65">
                {detailIsLockedUi
                  ? detailAchievement.description?.trim() ||
                    "This achievement is locked."
                  : detailAchievement.description?.trim() || "No description yet."}
              </p>
              {formatAchievedAt(detailAchievement.achievedAt) ? (
                <p className="mt-4 text-center text-xs text-white/40">
                  {formatAchievedAt(detailAchievement.achievedAt)}
                </p>
              ) : null}

              {!readOnly ? (
                <div
                  className={cn(
                    badgeChromeWidth,
                    achievementDialogChromeInset,
                    "mt-3 flex min-h-10 flex-col items-stretch gap-2",
                    !formatAchievedAt(detailAchievement.achievedAt) && "mt-6",
                  )}
                >
                  <div className="flex min-h-10 items-center">
                    <div
                      className={cn(achievementDialogIconSideSlot, "justify-start")}
                    >
                      {isVisibilityOnlyEdit ? (
                        <button
                          type="button"
                          aria-label={isSaving ? "Saving" : "Save visibility"}
                          className={cn(
                            achievementDialogIconBtn,
                            "bg-white/10 text-white hover:bg-white/15",
                          )}
                          disabled={isSaving}
                          onClick={() => void onSubmitPanelVisibilitySave()}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Check className="h-4 w-4" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-label="Edit"
                          className={achievementDialogIconBtn}
                          disabled={isSaving}
                          onClick={
                            dedicatedVisibilityEditable
                              ? onRequestPanelVisibilityEdit
                              : onRequestPanelEdit
                          }
                        >
                          <PenLine className="h-4 w-4" aria-hidden />
                        </button>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 justify-center">
                      {dedicatedVisibilityEditable && isVisibilityOnlyEdit ? (
                        <AchievementVisibilityToggle
                          visibility={panelForm.visibility}
                          disabled={isSaving}
                          onToggle={(visibility) =>
                            setPanelForm((prev) => ({ ...prev, visibility }))
                          }
                        />
                      ) : detailMode === "view" &&
                        detailIsDedicated &&
                        dedicationSenderId ? (
                        <DedicationByline
                          senderUserId={dedicationSenderId}
                          senderDisplayName={dedicationSenderDisplayName}
                          senderNameLoading={dedicationSenderNameLoading}
                          className="mt-0 px-1"
                        />
                      ) : null}
                    </div>
                    <div
                      className={cn(achievementDialogIconSideSlot, "justify-end")}
                    >
                      {isVisibilityOnlyEdit ? (
                        <span className="inline-flex h-10 w-10 shrink-0" aria-hidden />
                      ) : detailAchievement.hasCustomBadge ? (
                        <AchievementDetailShareMenu
                          disabled={isSaving}
                          busy={shareMenuBusy}
                          showDedicateOption={showDedicateShareOption}
                          dedicateDisabledReason={dedicateShareDisabledReason}
                          showcaseDisabledReason={showcaseShareDisabledReason}
                          showEmbedOption
                          onShareShowcase={onShareShowcase}
                          onRequestDedicateInvite={onRequestDedicateInviteShare}
                          onEmbed={onEmbedLink}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : detailMode === "view" && !isVisibilityOnlyEdit ? (
                detailIsDedicated && dedicationSenderId ? (
                  <DedicationBylineChromeRow
                    senderUserId={dedicationSenderId}
                    senderDisplayName={dedicationSenderDisplayName}
                    senderNameLoading={dedicationSenderNameLoading}
                    className={
                      !formatAchievedAt(detailAchievement.achievedAt) ? "mt-6" : undefined
                    }
                    endSlot={
                      detailAchievement.hasCustomBadge ? (
                        <AchievementDetailShareMenu
                          disabled={isSaving}
                          busy={shareMenuBusy}
                          showDedicateOption={false}
                          showEmbedOption={false}
                          showcaseDisabledReason={showcaseShareDisabledReason}
                          onShareShowcase={onShareShowcase}
                          onRequestDedicateInvite={onRequestDedicateInviteShare}
                          onEmbed={onEmbedLink}
                        />
                      ) : undefined
                    }
                  />
                ) : detailAchievement.hasCustomBadge ? (
                  <div
                    className={cn(
                      badgeChromeWidth,
                      achievementDialogChromeInset,
                      "mt-3 flex min-h-10 items-center justify-end",
                      !formatAchievedAt(detailAchievement.achievedAt) && "mt-6",
                    )}
                  >
                    <AchievementDetailShareMenu
                      disabled={isSaving}
                      busy={shareMenuBusy}
                      showDedicateOption={false}
                      showEmbedOption={false}
                      showcaseDisabledReason={showcaseShareDisabledReason}
                      onShareShowcase={onShareShowcase}
                      onRequestDedicateInvite={onRequestDedicateInviteShare}
                      onEmbed={onEmbedLink}
                    />
                  </div>
                ) : !formatAchievedAt(detailAchievement.achievedAt) ? (
                  <div className="mt-6" aria-hidden />
                ) : null
              ) : null}
            </div>
          ) : detailMode === "edit" && detailAchievement ? (
            <EditableAchievementCard
              form={panelForm}
              setForm={setPanelForm}
              isSaving={isSaving}
              onSubmit={onSubmitPanelSave}
              onCancel={onCancelPanelEdit}
              onUploadInProgressChange={setPanelUploadInProgress}
              badgeAssetSessionRef={panelBadgeAssetSessionRef}
              onClosePanel={() => closeDetailPanel()}
              showEditChrome
              onRequestDelete={
                detailAchievement
                  ? () => onRequestDelete(detailAchievement.id)
                  : undefined
              }
              canToggleLocked={isAdmin}
              badgeSessionController={badgeSessionController}
              badgeHost={transitionUi.badgeHost}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
