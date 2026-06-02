"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import type { LucideIcon } from "lucide-react";

import { BadgeSlot } from "@/components/achievements/badge/chrome/badge-slot";
import { FallbackBadge } from "@/components/achievements/badge/display/fallback-badge";
import { RemoteBadgeImage } from "@/components/achievements/badge/display/remote-badge-image";
import { ImpressionGlitterField } from "@/components/achievements/badge/effects/impression-glitter-field";
import { UnlockRevealWave } from "@/components/achievements/badge/effects/unlock-reveal-wave";
import { BadgeParallaxViewer } from "@/components/achievements/badge/parallax/badge-parallax-viewer";
import { BadgeGltfViewer } from "@/components/achievements/badge/model/badge-gltf-viewer";
import type { AchievementTone } from "@/components/achievements/achievement-manager-utils";
import {
  badgeImageMaskStylePadded,
  circularBadgeMaskStyle,
  paddedBadgeMaskStyle,
} from "@/lib/achievements/badge/parallax/badge-mask-style";
import { isOpaqueBadgeHit, type AlphaMaskData } from "@/lib/achievements/badge/parallax/shape-utils";
import { cn } from "@/lib/utils";
import type { AchievementRecord } from "@/lib/achievements/data/achievement-transformers";
import { hasModelGlbAsset } from "@/lib/achievements/badge/shared/badge-assets";

export type DetailBadgeInteractiveProps = {
  renderSrc: string;
  motionSeed: string;
  tone: AchievementTone;
  FallbackIcon: LucideIcon;
  achievement: AchievementRecord;
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
  achievement,
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
  const hasIconUrl = !!renderSrc;
  const isModelAsset = hasModelGlbAsset(achievement.icon_asset_kind, achievement.icon_asset_path);
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
        <BadgeGltfViewer
          iconAssetPath={achievement.icon_asset_path ?? ""}
          previewSrc={renderSrc}
          className="p-1"
          float={floating}
          motionSeed={motionSeed}
          motionStartCentered={motionStartCentered}
          initialYaw={achievement.icon_model_yaw}
          initialPitch={achievement.icon_model_pitch}
          playAnimation={achievement.icon_model_animation_play}
          animationSpeed={achievement.icon_model_animation_speed}
          stateKey={viewerStateKey}
          onPreviewDecoded={onImageDecoded}
          onModelUrlReady={onModelUrlReady}
          onVisualReady={onVisualReady}
        />
      );
    }

    return (
      <BadgeParallaxViewer
        src={renderSrc}
        className="p-1"
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
            {isModelAsset && achievement.icon_asset_path && showGlitter && !lockedUi ? (
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
