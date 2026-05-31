"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import type { LucideIcon } from "lucide-react";

import { BadgeSlot } from "@/components/achievements/badge/chrome/badge-slot";
import { FallbackBadge } from "@/components/achievements/badge/display/fallback-badge";
import { RemoteBadgeImage } from "@/components/achievements/badge/display/remote-badge-image";
import { ImpressionGlitterField } from "@/components/achievements/badge/effects/impression-glitter-field";
import { UnlockRevealWave } from "@/components/achievements/badge/effects/unlock-reveal-wave";
import { BadgeImageParallaxView } from "@/components/achievements/badge/detail/badge-image-parallax-view";
import { BadgeModelLiveView } from "@/components/achievements/badge/detail/badge-model-live-view";
import type { AchievementTone } from "@/components/achievements/achievement-manager-utils";
import {
  badgeImageMaskStylePadded,
  circularBadgeMaskStyle,
  paddedBadgeMaskStyle,
} from "@/lib/achievements/badge-mask-style";
import { isOpaqueBadgeHit, type AlphaMaskData } from "@/lib/badge/shape-utils";
import { cn } from "@/lib/utils";

export type DetailBadgeInteractiveProps = {
  renderSrc: string;
  motionSeed: string;
  tone: AchievementTone;
  FallbackIcon: LucideIcon;
  hasIconUrl: boolean;
  iconAssetKind?: "image" | "model_glb";
  iconAssetPath?: string | null;
  iconModelYaw?: number;
  iconModelPitch?: number;
  iconModelAnimationPlay?: boolean;
  iconModelAnimationSpeed?: number;
  viewerStateKey?: string;
  lockedUi: boolean;
  unlocking: boolean;
  floating?: boolean;
  motionStartCentered?: boolean;
  detailMaskStyle: CSSProperties | null;
  unlockRevealClipPath: string;
  unlockAlphaMaskRef: RefObject<AlphaMaskData | null>;
  slotClassName?: string;
  enableUnlockHold?: boolean;
  onUnlockPointerDown?: () => void;
  onUnlockPointerEnd?: () => void;
  onImageDecoded?: () => void;
  onModelUrlReady?: () => void;
  onVisualReady?: () => void;
  impressionOverlay?: ReactNode;
  impressionGlitter?: boolean;
  impressionGlitterRevealPulse?: number;
  dedicatedBadgeGlitter?: boolean;
};

/**
 * Detail-panel badge stack: GLB live viewer OR image parallax viewer, unlock wave, glitter.
 */
export function DetailBadgeInteractive({
  renderSrc,
  motionSeed,
  tone,
  FallbackIcon,
  hasIconUrl,
  iconAssetKind = "image",
  iconAssetPath = null,
  iconModelYaw = 0,
  iconModelPitch = 0,
  iconModelAnimationPlay = true,
  iconModelAnimationSpeed = 1,
  viewerStateKey,
  lockedUi,
  unlocking,
  floating = true,
  motionStartCentered = false,
  detailMaskStyle,
  unlockRevealClipPath,
  unlockAlphaMaskRef,
  slotClassName,
  enableUnlockHold = false,
  onUnlockPointerDown,
  onUnlockPointerEnd,
  onImageDecoded,
  onModelUrlReady,
  onVisualReady,
  impressionOverlay,
  impressionGlitter = false,
  impressionGlitterRevealPulse = 0,
  dedicatedBadgeGlitter = false,
}: DetailBadgeInteractiveProps) {
  const isModelAsset = iconAssetKind === "model_glb" && Boolean(iconAssetPath?.trim());
  const showGlitter =
    dedicatedBadgeGlitter ||
    (process.env.NEXT_PUBLIC_IMPRESSION_GLITTER_UI_ENABLED === "true" &&
      impressionGlitter);
  const glitterRevealPulse = dedicatedBadgeGlitter ? 0 : impressionGlitterRevealPulse;
  const glitterMaskStyle = renderSrc
    ? badgeImageMaskStylePadded(renderSrc, 108)
    : paddedBadgeMaskStyle(circularBadgeMaskStyle(), 108);

  const unlockedBadgeContent = () => {
    if (lockedUi) {
      return renderSrc ? (
        <RemoteBadgeImage
          src={renderSrc}
          className="h-full w-full object-contain p-1 opacity-80 grayscale"
          onDecoded={onImageDecoded}
        />
      ) : null;
    }

    if (isModelAsset) {
      return (
        <BadgeModelLiveView
          iconAssetPath={iconAssetPath ?? ""}
          renderSrc={renderSrc}
          hasIconUrl={hasIconUrl}
          enabled
          float={floating}
          motionSeed={motionSeed}
          motionStartCentered={motionStartCentered}
          initialYaw={iconModelYaw}
          initialPitch={iconModelPitch}
          playAnimation={iconModelAnimationPlay}
          animationSpeed={iconModelAnimationSpeed}
          viewerStateKey={viewerStateKey}
          onPreviewDecoded={onImageDecoded}
          onModelUrlReady={onModelUrlReady}
          onVisualReady={onVisualReady}
        />
      );
    }

    return (
      <BadgeImageParallaxView
        renderSrc={renderSrc}
        float={floating}
        motionSeed={motionSeed}
        motionStartCentered={motionStartCentered}
        onImageDecoded={onImageDecoded}
        onVisualReady={onVisualReady}
        impressionGlitter={showGlitter}
        impressionGlitterRevealPulse={glitterRevealPulse}
      />
    );
  };

  return (
    <div className="relative">
      {impressionOverlay}
      <BadgeSlot size="detail" className={cn("relative", slotClassName)}>
        {enableUnlockHold && lockedUi ? (
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
                  "filled",
                )
              ) {
                return;
              }
              onUnlockPointerDown?.();
            }}
            onPointerUp={onUnlockPointerEnd}
            onPointerLeave={onUnlockPointerEnd}
            onPointerCancel={onUnlockPointerEnd}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : null}
        {hasIconUrl ? (
          <>
            <div className="relative h-full w-full">{unlockedBadgeContent()}</div>
            {isModelAsset && iconAssetPath && showGlitter && !lockedUi ? (
              <ImpressionGlitterField
                active
                motionSeed={motionSeed}
                maskStyle={glitterMaskStyle}
                revealPulse={glitterRevealPulse}
                variant="detail"
                overlay
                className="z-[18]"
              />
            ) : null}
            {showGlitter && lockedUi ? (
              <ImpressionGlitterField
                active
                motionSeed={motionSeed}
                maskStyle={glitterMaskStyle}
                revealPulse={glitterRevealPulse}
                variant="detail"
                overlay
                className="z-[19]"
              />
            ) : null}
            <UnlockRevealWave
              isUnlocking={unlocking}
              detailMaskStyle={detailMaskStyle}
              unlockRevealClipPath={unlockRevealClipPath}
            >
              <RemoteBadgeImage
                src={renderSrc}
                className="h-full w-full object-contain p-1"
              />
            </UnlockRevealWave>
          </>
        ) : (
          <>
            <div className="relative h-full w-full">
              {showGlitter ? (
                <ImpressionGlitterField
                  active
                  motionSeed={motionSeed}
                  maskStyle={paddedBadgeMaskStyle(circularBadgeMaskStyle(), 108)}
                  revealPulse={glitterRevealPulse}
                  variant="detail"
                />
              ) : null}
              <FallbackBadge
                tone={tone}
                isLocked={lockedUi}
                FallbackIcon={FallbackIcon}
                size="detail"
              />
            </div>
            <UnlockRevealWave
              isUnlocking={unlocking}
              detailMaskStyle={detailMaskStyle}
              unlockRevealClipPath={unlockRevealClipPath}
            >
              <FallbackBadge
                tone={tone}
                isLocked={false}
                FallbackIcon={FallbackIcon}
                size="detail"
              />
            </UnlockRevealWave>
          </>
        )}
      </BadgeSlot>
    </div>
  );
}
