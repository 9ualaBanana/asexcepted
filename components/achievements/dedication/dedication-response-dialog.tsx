"use client";

import { useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

import { AchievementDetailBadgeInteractive } from "@/components/achievements/badge";
import { DedicationBylineChromeRow } from "@/components/achievements/dedication/dedication-byline-chrome-row";
import { resolveTone } from "@/components/achievements/achievement-manager-utils";
import {
  achievementDialogIconBtn,
  getSafeIcon,
} from "@/components/achievements/achievement-editor-shared";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { useBodyScrollLock } from "@/lib/dom/body-scroll-lock";
import { cn } from "@/lib/utils";

type DedicationResponseDialogProps = {
  achievement: AchievementRecord;
  senderDisplayName: string;
  isBusy: boolean;
  onDismiss: () => void;
  onAccept: () => void;
  onReject: () => void;
};

export function DedicationResponseDialog({
  achievement,
  senderDisplayName,
  isBusy,
  onDismiss,
  onAccept,
  onReject,
}: DedicationResponseDialogProps) {
  const unlockAlphaMaskRef = useRef(null);
  const tone = resolveTone(achievement);
  const FallbackIcon = getSafeIcon(achievement.icon);
  const renderSrc = useMemo(() => {
    const src = achievement.icon_url?.trim() ?? "";
    return src ? toOptimizedBadgeRenderSrc(src) : "";
  }, [achievement.icon_url]);

  useBodyScrollLock();

  if (typeof document === "undefined") {
    return null;
  }

  const senderId = achievement.dedicated_by_user_id ?? "";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dedication-response-title"
      className="fixed inset-0 z-[225] flex min-h-0 w-full min-w-0 flex-col overscroll-contain min-h-screen min-h-[100dvh]"
    >
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-black/[65.5%] backdrop-blur-sm"
        onClick={onDismiss}
      />
      <div className="pointer-events-none relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <div
          className={cn(
            "pointer-events-auto relative mx-auto my-auto flex w-full max-w-lg max-h-[min(92dvh,56rem)] min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-3xl border border-white/12 bg-card p-4 pb-6 text-card-foreground sm:p-6 sm:pb-6",
            "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_0_rgba(255,255,255,0.08),inset_0_-1px_0_0_rgba(0,0,0,0.12)]",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center">
            <AchievementDetailBadgeInteractive
              renderSrc={renderSrc}
              motionSeed={achievement.id}
              FallbackIcon={FallbackIcon}
              hasIconUrl={Boolean(renderSrc)}
              iconAssetKind={achievement.icon_asset_kind}
              iconAssetPath={achievement.icon_asset_path}
              iconModelYaw={achievement.icon_model_yaw}
              iconModelPitch={achievement.icon_model_pitch}
              iconModelAnimationPlay={achievement.icon_model_animation_play}
              iconModelAnimationSpeed={achievement.icon_model_animation_speed}
              tone={tone}
              lockedUi
              unlocking={false}
              floating={false}
              detailMaskStyle={null}
              unlockRevealClipPath="inset(0 0 0 0)"
              unlockAlphaMaskRef={unlockAlphaMaskRef}
              enableUnlockHold={false}
              dedicatedBadgeGlitter
            />
          </div>

          <p className="mt-8 w-full text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
            {achievement.category?.trim() || "Dedicated"}
          </p>
          <h2
            id="dedication-response-title"
            className="mt-2 text-center text-xl font-semibold tracking-tight text-white"
          >
            {achievement.title?.trim() || "Achievement"}
          </h2>
          <p className="mt-4 break-words text-center text-sm leading-relaxed text-white/65">
            {achievement.description?.trim() ||
              "Someone dedicated this achievement to you."}
          </p>

          {senderId ? (
            <DedicationBylineChromeRow
              senderUserId={senderId}
              senderDisplayName={senderDisplayName}
              className="mt-6"
              startSlot={
                <button
                  type="button"
                  aria-label="Accept dedication"
                  disabled={isBusy}
                  className={cn(achievementDialogIconBtn, "h-11 w-11")}
                  onClick={onAccept}
                >
                  <Check className="h-5 w-5" aria-hidden />
                </button>
              }
              endSlot={
                <button
                  type="button"
                  aria-label="Reject dedication"
                  disabled={isBusy}
                  className={cn(achievementDialogIconBtn, "h-11 w-11")}
                  onClick={onReject}
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              }
            />
          ) : (
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                aria-label="Accept dedication"
                disabled={isBusy}
                className={cn(achievementDialogIconBtn, "h-11 w-11")}
                onClick={onAccept}
              >
                <Check className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Reject dedication"
                disabled={isBusy}
                className={cn(achievementDialogIconBtn, "h-11 w-11")}
                onClick={onReject}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
