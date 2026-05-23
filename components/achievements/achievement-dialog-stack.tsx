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
import { Link2, PenLine, X, type LucideIcon } from "lucide-react";

import type { AchievementTone } from "@/components/achievements/achievement-card";
import { AchievementDetailBadgeInteractive } from "@/components/achievements/badge/achievement-detail-badge-interactive";
import type { AlphaMaskData } from "@/lib/badge/shape-utils";
import {
  achievementBadgeChromeWidth,
  achievementDialogChromeInset,
  achievementDialogIconBtn,
  achievementDialogIconSideSlot,
  type BadgeIkSession,
  formatAchievedAt,
  type FormState,
} from "@/components/achievements/achievement-editor-shared";
import { EditableAchievementCard } from "@/components/achievements/editable-achievement-card";
import { ImpressionBurst } from "@/components/achievements/badge/impression-burst";
import { submitImpression } from "@/components/achievements/use-impression-on-badge";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import { TutorialCallout } from "@/components/tutorials/tutorial-callout";
import { useDoubleActivate } from "@/lib/hooks/use-double-activate";
import { getTutorial, TUTORIAL_IDS, useTutorial } from "@/lib/tutorials";
import { cn } from "@/lib/utils";

export type AchievementDialogStackProps = {
  readOnly: boolean;
  editorUploadInProgress: boolean;
  closeDetailPanel: () => void;

  isCreating: boolean;
  createForm: FormState;
  setCreateForm: Dispatch<SetStateAction<FormState>>;
  setCreateUploadInProgress: (inProgress: boolean) => void;
  createBadgeIkSessionRef: RefObject<BadgeIkSession>;
  onSubmitCreate: (e: FormEvent) => void | Promise<void>;
  onCancelCreate: () => void;

  detailMode: "view" | "edit";
  detailAchievement: AchievementRecord | null;
  panelForm: FormState;
  setPanelForm: Dispatch<SetStateAction<FormState>>;
  setPanelUploadInProgress: (inProgress: boolean) => void;
  panelBadgeIkSessionRef: RefObject<BadgeIkSession>;
  onSubmitPanelSave: (e: FormEvent) => void | Promise<void>;
  onCancelPanelEdit: () => void;
  onRequestPanelEdit: () => void;

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
  onDetailBadgeVisualReady: () => void;
  optimisticUnlockedAchievementId: string | null;

  isSaving: boolean;
  embedCopyBusy: boolean;
  embedCopyHint: string | null;
  onCopyEmbedLink: () => void;
  onRequestDelete: (achievementId: string) => void;
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
    createBadgeIkSessionRef,
    onSubmitCreate,
    onCancelCreate,
    detailMode,
    detailAchievement,
    panelForm,
    setPanelForm,
    setPanelUploadInProgress,
    panelBadgeIkSessionRef,
    onSubmitPanelSave,
    onCancelPanelEdit,
    onRequestPanelEdit,
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
    onDetailBadgeVisualReady,
    optimisticUnlockedAchievementId,
    isSaving,
    embedCopyBusy,
    embedCopyHint,
    onCopyEmbedLink,
    onRequestDelete,
  } = props;

  const impressionTutorial = useTutorial(TUTORIAL_IDS.impressionDoubleTap);
  const unlockHoldTutorial = useTutorial(TUTORIAL_IDS.unlockHold);
  const [impressionBurstPulse, setImpressionBurstPulse] = useState(0);

  const handleUnlockPointerDown = useCallback(() => {
    unlockHoldTutorial.dismiss();
    startUnlockHold();
  }, [startUnlockHold, unlockHoldTutorial]);

  const handleLeaveImpression = useCallback(() => {
    if (!detailAchievement || !readOnly || detailIsUnlocking) {
      return;
    }

    setImpressionBurstPulse((n) => n + 1);
    impressionTutorial.dismiss();

    void submitImpression(detailAchievement.id).then((result) => {
      if (result.ok) {
        impressionTutorial.dismiss();
      }
    });
  }, [
    detailAchievement,
    readOnly,
    detailIsUnlocking,
    impressionTutorial,
  ]);

  const impressionDoubleActivate = useDoubleActivate({
    onActivate: handleLeaveImpression,
    disabled: !readOnly || !detailAchievement || detailIsUnlocking,
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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
              badgeIkSessionRef={createBadgeIkSessionRef}
              baselineIconFileId={createBadgeIkSessionRef.current.baselineFileId}
              onClosePanel={() => closeDetailPanel()}
            />
          ) : detailMode === "view" && detailAchievement ? (
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
                    {readOnly && impressionTutorial.active ? (
                      <TutorialCallout
                        message={
                          getTutorial(TUTORIAL_IDS.impressionDoubleTap).message
                        }
                        onDismiss={impressionTutorial.dismiss}
                        className="absolute bottom-[88%] left-1/2 z-40 w-max max-w-[10.5rem] -translate-x-1/2"
                      />
                    ) : null}
                    {!readOnly && detailIsLockedUi && unlockHoldTutorial.active ? (
                      <TutorialCallout
                        message={getTutorial(TUTORIAL_IDS.unlockHold).message}
                        onDismiss={unlockHoldTutorial.dismiss}
                        className="absolute bottom-[88%] left-1/2 z-40 w-max max-w-[11rem] -translate-x-1/2"
                      />
                    ) : null}
                    <AchievementDetailBadgeInteractive
                      renderSrc={detailRenderSrc}
                      motionSeed={detailAchievement.id}
                      tone={detailTone}
                      FallbackIcon={DetailFallbackIcon}
                      hasIconUrl={Boolean(detailAchievement.icon_url?.trim())}
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
                      onVisualReady={onDetailBadgeVisualReady}
                      impressionOverlay={
                        readOnly ? (
                          <ImpressionBurst pulse={impressionBurstPulse} />
                        ) : null
                      }
                    />
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
                      <button
                        type="button"
                        aria-label="Edit"
                        className={achievementDialogIconBtn}
                        disabled={isSaving}
                        onClick={onRequestPanelEdit}
                      >
                        <PenLine className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1" aria-hidden />
                    <div
                      className={cn(achievementDialogIconSideSlot, "justify-end")}
                    >
                      {detailAchievement.icon_url?.trim() ? (
                        <button
                          type="button"
                          aria-label="Copy embed link"
                          className={achievementDialogIconBtn}
                          disabled={isSaving || embedCopyBusy}
                          onClick={() => void onCopyEmbedLink()}
                        >
                          <Link2 className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {embedCopyHint ? (
                    <p className="text-center text-xs text-white/50" role="status">
                      {embedCopyHint}
                    </p>
                  ) : null}
                </div>
              ) : formatAchievedAt(detailAchievement.achieved_at) ? null : (
                <div className="mt-6" aria-hidden />
              )}
            </div>
          ) : detailAchievement ? (
            <EditableAchievementCard
              form={panelForm}
              setForm={setPanelForm}
              isSaving={isSaving}
              onSubmit={onSubmitPanelSave}
              onCancel={onCancelPanelEdit}
              onUploadInProgressChange={setPanelUploadInProgress}
              badgeIkSessionRef={panelBadgeIkSessionRef}
              baselineIconFileId={panelBadgeIkSessionRef.current.baselineFileId}
              onClosePanel={() => closeDetailPanel()}
              showBackArrow
              onRequestDelete={
                detailAchievement
                  ? () => onRequestDelete(detailAchievement.id)
                  : undefined
              }
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
