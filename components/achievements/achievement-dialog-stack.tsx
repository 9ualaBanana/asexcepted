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
import { AchievementBadgeSlot } from "@/components/achievements/badge/achievement-badge-slot";
import { AchievementFallbackBadge } from "@/components/achievements/badge/achievement-fallback-badge";
import { AchievementBadge3DViewer } from "@/components/achievements/badge/achievement-badge-3d-viewer";
import { UnlockRevealWave } from "@/components/achievements/badge/unlock-reveal-wave";
import { isOpaqueBadgeHit, type AlphaMaskData } from "@/lib/badge/shape-utils";
import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import {
  achievementBadgeChromeWidth,
  achievementDialogChromeInset,
  achievementDialogIconBtn,
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
  const [impressionBurstPulse, setImpressionBurstPulse] = useState(0);

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
      <div
        className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6"
        onClick={() => {
          if (editorUploadInProgress) return;
          closeDetailPanel();
        }}
      >
        <div
          className={cn(
            "relative mx-auto my-auto flex w-full max-w-lg max-h-[min(92dvh,56rem)] min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-3xl border border-white/12 bg-card p-4 pb-6 text-card-foreground sm:p-6 sm:pb-6",
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
                    <AchievementBadgeSlot size="detail" className="relative">
                    {detailIsLockedUi && !readOnly ? (
                      <button
                        type="button"
                        aria-label="Press and hold to unlock"
                        className={cn(
                          "no-tap-highlight absolute inset-0 z-20",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                        )}
                        onPointerDown={(e) => {
                          if (
                            !isOpaqueBadgeHit(
                              e.clientX,
                              e.clientY,
                              e.currentTarget.getBoundingClientRect(),
                              unlockAlphaMaskRef.current,
                            )
                          ) {
                            return;
                          }
                          startUnlockHold();
                        }}
                        onPointerUp={cancelUnlockHold}
                        onPointerLeave={cancelUnlockHold}
                        onPointerCancel={cancelUnlockHold}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    ) : null}
                    {detailAchievement.icon_url?.trim() ? (
                      <>
                        <div className="relative h-full w-full">
                          <AchievementBadge3DViewer
                            src={detailRenderSrc}
                            className="p-1"
                            float={detailFloating}
                            motionSeed={detailAchievement.id}
                            motionStartCentered={
                              optimisticUnlockedAchievementId === detailAchievement.id
                            }
                            onImageDecoded={onDetailBadgeImageDecoded}
                            onVisualReady={onDetailBadgeVisualReady}
                          />
                        </div>
                        {detailIsLockedUi ? (
                          <div className="absolute inset-0">
                            <RemoteBadgeImage
                              src={detailRenderSrc}
                              className={cn(
                                "p-1 h-full w-full object-contain opacity-80 grayscale",
                                detailIsUnlocking && "opacity-90",
                              )}
                            />
                          </div>
                        ) : null}
                        <UnlockRevealWave
                          isUnlocking={detailIsUnlocking}
                          detailMaskStyle={detailMaskStyle}
                          unlockRevealClipPath={unlockRevealClipPath}
                        >
                          <RemoteBadgeImage
                            src={detailRenderSrc}
                            className="p-1 h-full w-full object-contain"
                          />
                        </UnlockRevealWave>
                      </>
                    ) : (
                      <>
                        <AchievementFallbackBadge
                          tone={detailTone}
                          isLocked={detailIsLockedUi}
                          FallbackIcon={DetailFallbackIcon}
                          size="detail"
                        />
                        <UnlockRevealWave
                          isUnlocking={detailIsUnlocking}
                          detailMaskStyle={detailMaskStyle}
                          unlockRevealClipPath={unlockRevealClipPath}
                        >
                          <AchievementFallbackBadge
                            tone={detailTone}
                            isLocked={false}
                            FallbackIcon={DetailFallbackIcon}
                            size="detail"
                          />
                        </UnlockRevealWave>
                      </>
                    )}
                    </AchievementBadgeSlot>
                    {readOnly ? (
                      <ImpressionBurst pulse={impressionBurstPulse} />
                    ) : null}
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
                  <div className="flex min-h-10 items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Edit"
                        className={achievementDialogIconBtn}
                        disabled={isSaving}
                        onClick={onRequestPanelEdit}
                      >
                        <PenLine className="h-4 w-4" aria-hidden />
                      </button>
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
