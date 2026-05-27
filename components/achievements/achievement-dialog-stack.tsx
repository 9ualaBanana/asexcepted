"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { Check, Loader2, PenLine, X, type LucideIcon } from "lucide-react";

import type { AchievementTone } from "@/components/achievements/achievement-card";
import { BadgeAttributionPopover } from "@/components/achievements/badge/badge-attribution-popover";
import { AchievementDetailBadgeInteractive } from "@/components/achievements/badge/achievement-detail-badge-interactive";
import type { AlphaMaskData } from "@/lib/badge/shape-utils";
import {
  achievementBadgeChromeWidth,
  achievementDialogChromeInset,
  achievementDialogIconBtn,
  achievementDialogIconSideSlot,
  type BadgeAssetSession,
  formatAchievedAt,
  type FormState,
} from "@/components/achievements/achievement-editor-shared";
import { DedicationByline } from "@/components/achievements/dedication/dedication-byline";
import { DedicationBylineChromeRow } from "@/components/achievements/dedication/dedication-byline-chrome-row";
import { AchievementDetailShareMenu } from "@/components/achievements/achievement-detail-share-menu";
import { EditableAchievementCard } from "@/components/achievements/editable-achievement-card";
import { AchievementVisibilityToggle } from "@/components/achievements/achievement-visibility-toggle";
import {
  canEditDedicatedVisibility,
  isDedicatedAchievement,
} from "@/lib/achievements/dedication-utils";
import { ImpressionBurst } from "@/components/achievements/badge/impression-burst";
import { submitImpression } from "@/components/achievements/use-impression-on-badge";
import {
  achievementHasCustomBadge,
  type AchievementRecord,
} from "@/components/achievements/achievement-transformers";
import type { AchievementBadgeSessionController } from "@/components/achievements/use-achievement-badge-session-controller";
import { useDoubleActivate } from "@/lib/hooks/use-double-activate";
import { useBodyScrollLock } from "@/lib/dom/body-scroll-lock";
import { getTutorial, TUTORIAL_IDS, useTutorial, useTutorialToast } from "@/lib/tutorials";
import { cn } from "@/lib/utils";

export type AchievementDialogStackProps = {
  readOnly: boolean;
  editorUploadInProgress: boolean;
  closeDetailPanel: () => void;

  isCreating: boolean;
  createForm: FormState;
  setCreateForm: Dispatch<SetStateAction<FormState>>;
  setCreateUploadInProgress: (inProgress: boolean) => void;
  createBadgeAssetSessionRef: RefObject<BadgeAssetSession>;
  onSubmitCreate: (e: FormEvent) => void | Promise<void>;
  onCancelCreate: () => void;

  detailMode: "view" | "edit";
  isVisibilityOnlyEdit?: boolean;
  detailViewSessionKey: number;
  detailAchievement: AchievementRecord | null;
  panelForm: FormState;
  setPanelForm: Dispatch<SetStateAction<FormState>>;
  setPanelUploadInProgress: (inProgress: boolean) => void;
  panelBadgeAssetSessionRef: RefObject<BadgeAssetSession>;
  onSubmitPanelSave: (e: FormEvent) => void | Promise<void>;
  onSubmitPanelVisibilitySave: () => void | Promise<void>;
  onCancelPanelEdit: () => void;
  onRequestPanelEdit: () => void;
  onRequestPanelVisibilityEdit: () => void;

  detailIsUnlocking: boolean;
  detailIsLockedUi: boolean;
  detailFloating: boolean;
  detailRenderSrc: string;
  detailTone: AchievementTone;
  DetailFallbackIcon: LucideIcon;
  unlockRevealClipPath: string;
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
  showDedicateShareOption?: boolean;
  onShareShowcase: () => void;
  onRequestDedicateInviteShare: () => void;
  onEmbedLink: () => void;
  onRequestDelete: (achievementId: string) => void;
  detailShowsImpressionGlitter: boolean;
  dedicatedBadgeGlitter?: boolean;
  impressionGlitterRevealPulse: number;
  onImpressionGlitterReveal: () => void;
  onImpressionRecorded: (added: boolean, hadImpressionsBefore: boolean) => void;
  dedicationSenderDisplayName?: string | null;
  isDedicatingCreate?: boolean;
  badgeSessionController: AchievementBadgeSessionController;
  showBadgeSpinAfterFirstUnlock?: boolean;
  setShowBadgeSpinAfterFirstUnlock?: (show: boolean) => void;
};

export function AchievementDialogStack(props: AchievementDialogStackProps) {
  const {
    readOnly,
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
    onDetailBadgeImageDecoded,
    onDetailBadgeModelUrlReady,
    onDetailBadgeVisualReady,
    optimisticUnlockedAchievementId,
    isSaving,
    shareMenuBusy,
    dedicateShareDisabledReason = null,
    showDedicateShareOption = true,
    onShareShowcase,
    onRequestDedicateInviteShare,
    onEmbedLink,
    onRequestDelete,
    detailShowsImpressionGlitter,
    dedicatedBadgeGlitter = false,
    impressionGlitterRevealPulse,
    onImpressionGlitterReveal,
    onImpressionRecorded,
    dedicationSenderDisplayName,
    isDedicatingCreate = false,
    badgeSessionController,
    showBadgeSpinAfterFirstUnlock = false,
    setShowBadgeSpinAfterFirstUnlock,
  } = props;

  const detailIsDedicated =
    detailAchievement != null && isDedicatedAchievement(detailAchievement);
  const dedicatedVisibilityEditable =
    detailAchievement != null && canEditDedicatedVisibility(detailAchievement);
  const dedicationSenderId = detailAchievement?.dedicated_by_user_id ?? null;
  const showDetailContent =
    detailAchievement != null &&
    (detailMode === "view" || isVisibilityOnlyEdit);

  const impressionTutorial = useTutorial(TUTORIAL_IDS.impressionDoubleTap);
  const unlockHoldTutorial = useTutorial(TUTORIAL_IDS.unlockHold);
  const badgeSpinTutorial = useTutorial(TUTORIAL_IDS.badgeSpin);
  const impressionTutorialDefinition = getTutorial(TUTORIAL_IDS.impressionDoubleTap);
  const unlockHoldTutorialDefinition = getTutorial(TUTORIAL_IDS.unlockHold);
  const badgeSpinTutorialDefinition = getTutorial(TUTORIAL_IDS.badgeSpin);
  const detailHasCustomBadge =
    detailAchievement != null && achievementHasCustomBadge(detailAchievement);
  const [impressionBurstPulse, setImpressionBurstPulse] = useState(0);

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
    startUnlockHold();
  }, [startUnlockHold]);

  const handleLeaveImpression = useCallback(() => {
    if (
      !detailAchievement ||
      !readOnly ||
      detailIsUnlocking ||
      detailIsLockedUi
    ) {
      return;
    }

    const hadImpressionsBefore =
      (detailAchievement.impression_count ?? 0) > 0 || detailShowsImpressionGlitter;

    setImpressionBurstPulse((n) => n + 1);
    impressionTutorial.dismiss();

    if (!hadImpressionsBefore) {
      onImpressionGlitterReveal();
    }

    void submitImpression(detailAchievement.id).then((result) => {
      if (result.ok) {
        impressionTutorial.dismiss();
      }
      onImpressionRecorded(result.added, hadImpressionsBefore);
    });
  }, [
    detailAchievement,
    detailIsLockedUi,
    detailIsUnlocking,
    detailShowsImpressionGlitter,
    impressionTutorial,
    onImpressionGlitterReveal,
    onImpressionRecorded,
    readOnly,
  ]);

  const impressionDoubleActivate = useDoubleActivate({
    onActivate: handleLeaveImpression,
    disabled:
      !readOnly ||
      !detailAchievement ||
      detailIsUnlocking ||
      detailIsLockedUi,
  });

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
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-black/[65.5%] backdrop-blur-sm"
        onClick={() => {
          if (editorUploadInProgress) return;
          closeDetailPanel();
        }}
      />
      <div className="pointer-events-none relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <div
          className={cn(
            "pointer-events-auto relative mx-auto my-auto flex w-full max-w-lg max-h-[min(92dvh,56rem)] min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-3xl border border-white/12 bg-card p-4 pb-6 text-card-foreground sm:p-6 sm:pb-6",
            "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_0_rgba(255,255,255,0.08),inset_0_-1px_0_0_rgba(0,0,0,0.12),inset_1px_0_0_0_rgba(255,255,255,0.05),inset_-1px_0_0_0_rgba(255,255,255,0.05),inset_0_0_12px_rgba(0,0,0,0.1),0_4px_14px_-3px_rgba(0,0,0,0.24),0_16px_44px_-12px_rgba(0,0,0,0.32)]",
            "outline-none focus-visible:outline-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            (isCreating || detailMode === "edit") && "overflow-x-hidden",
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
              badgeSessionController={badgeSessionController}
              isCreatingFlow
            />
          ) : showDetailContent ? (
            <div className="no-tap-highlight flex w-full flex-col items-center pt-1">
              <div className={achievementBadgeChromeWidth}>
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
                    className={cn(
                      "relative",
                      readOnly && !detailIsUnlocking && "no-tap-highlight",
                    )}
                    onDoubleClick={
                      readOnly ? impressionDoubleActivate.onDoubleClick : undefined
                    }
                    onPointerUp={
                      readOnly ? impressionDoubleActivate.onPointerUp : undefined
                    }
                  >
                    <AchievementDetailBadgeInteractive
                      renderSrc={detailRenderSrc}
                      motionSeed={detailAchievement.id}
                      tone={detailTone}
                      FallbackIcon={DetailFallbackIcon}
                      hasIconUrl={Boolean(detailAchievement.icon_url?.trim())}
                      iconAssetKind={detailAchievement.icon_asset_kind}
                      iconAssetPath={detailAchievement.icon_asset_path}
                      iconModelYaw={detailAchievement.icon_model_yaw}
                      iconModelPitch={detailAchievement.icon_model_pitch}
                      viewerStateKey={`${detailAchievement.id}:detail:${detailViewSessionKey}`}
                      lockedUi={detailIsLockedUi}
                      unlocking={detailIsUnlocking}
                      floating={detailFloating}
                      motionStartCentered={
                        optimisticUnlockedAchievementId === detailAchievement.id
                      }
                      detailMaskStyle={detailMaskStyle}
                      unlockRevealClipPath={unlockRevealClipPath}
                      unlockAlphaMaskRef={unlockAlphaMaskRef}
                      enableUnlockHold={detailIsLockedUi && !readOnly}
                      onUnlockPointerDown={handleUnlockPointerDown}
                      onUnlockPointerEnd={cancelUnlockHold}
                      onImageDecoded={onDetailBadgeImageDecoded}
                      onModelUrlReady={onDetailBadgeModelUrlReady}
                      onVisualReady={onDetailBadgeVisualReady}
                      impressionGlitter={detailShowsImpressionGlitter}
                      dedicatedBadgeGlitter={dedicatedBadgeGlitter}
                      impressionGlitterRevealPulse={impressionGlitterRevealPulse}
                      impressionOverlay={
                        readOnly ? (
                          <ImpressionBurst pulse={impressionBurstPulse} />
                        ) : null
                      }
                    />
                    {(detailAchievement.icon_asset_kind === "model_glb" ||
                      detailAchievement.icon_cc_attribution?.trim()) && (
                      <BadgeAttributionPopover
                        value={detailAchievement.icon_cc_attribution ?? ""}
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
              {formatAchievedAt(detailAchievement.achieved_at) ? (
                <p className="mt-4 text-center text-xs text-white/40">
                  {formatAchievedAt(detailAchievement.achieved_at)}
                </p>
              ) : null}

              {readOnly &&
              detailIsDedicated &&
              dedicationSenderId &&
              detailMode === "view" &&
              !isVisibilityOnlyEdit ? (
                <DedicationBylineChromeRow
                  senderUserId={dedicationSenderId}
                  senderDisplayName={
                    dedicationSenderDisplayName?.trim() || "Someone"
                  }
                  className={!formatAchievedAt(detailAchievement.achieved_at) ? "mt-6" : undefined}
                />
              ) : null}

              {!readOnly ? (
                <div
                  className={cn(
                    achievementBadgeChromeWidth,
                    achievementDialogChromeInset,
                    "mt-3 flex min-h-10 flex-col items-stretch gap-2",
                    !formatAchievedAt(detailAchievement.achieved_at) && "mt-6",
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
                          senderDisplayName={
                            dedicationSenderDisplayName?.trim() || "Someone"
                          }
                          className="mt-0 px-1"
                        />
                      ) : null}
                    </div>
                    <div
                      className={cn(achievementDialogIconSideSlot, "justify-end")}
                    >
                      {isVisibilityOnlyEdit ? (
                        <button
                          type="button"
                          aria-label="Cancel editing visibility"
                          className={achievementDialogIconBtn}
                          disabled={isSaving}
                          onClick={onCancelPanelEdit}
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      ) : detailAchievement.icon_url?.trim() ? (
                        <AchievementDetailShareMenu
                          disabled={isSaving}
                          busy={shareMenuBusy}
                          showDedicateOption={showDedicateShareOption}
                          dedicateDisabledReason={dedicateShareDisabledReason}
                          onShareShowcase={onShareShowcase}
                          onRequestDedicateInvite={onRequestDedicateInviteShare}
                          onEmbed={onEmbedLink}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : formatAchievedAt(detailAchievement.achieved_at) ||
                (detailIsDedicated && dedicationSenderId) ? null : (
                <div className="mt-6" aria-hidden />
              )}
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
              badgeSessionController={badgeSessionController}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
