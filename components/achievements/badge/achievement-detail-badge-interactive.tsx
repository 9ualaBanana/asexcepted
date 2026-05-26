"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import type { LucideIcon } from "lucide-react";

import { AchievementBadgeSlot } from "@/components/achievements/badge/achievement-badge-slot";
import { AchievementBadgeModelViewer } from "@/components/achievements/badge/achievement-badge-model-viewer";
import { ImpressionGlitterField } from "@/components/achievements/badge/impression-glitter-field";
import { AchievementFallbackBadge } from "@/components/achievements/badge/achievement-fallback-badge";
import { AchievementBadge3DViewer } from "@/components/achievements/badge/achievement-badge-3d-viewer";
import { useSignedBadgeModelUrl } from "@/components/achievements/badge/use-signed-badge-model-url";
import {
  badgeImageMaskStylePadded,
  circularBadgeMaskStyle,
  paddedBadgeMaskStyle,
} from "@/lib/achievements/badge-mask-style";
import { IMPRESSION_GLITTER_UI_ENABLED } from "@/lib/achievements/impression-glitter-feature";
import { UnlockRevealWave } from "@/components/achievements/badge/unlock-reveal-wave";
import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import type { AchievementTone } from "@/components/achievements/achievement-card";
import { isOpaqueBadgeHit, type AlphaMaskData } from "@/lib/badge/shape-utils";
import { cn } from "@/lib/utils";

export type AchievementDetailBadgeInteractiveProps = {
  renderSrc: string;
  motionSeed: string;
  tone: AchievementTone;
  FallbackIcon: LucideIcon;
  hasIconUrl: boolean;
  iconAssetKind?: "image" | "model_glb";
  iconAssetPath?: string | null;
  lockedUi: boolean;
  unlocking: boolean;
  floating: boolean;
  motionStartCentered?: boolean;
  detailMaskStyle: CSSProperties | null;
  unlockRevealClipPath: string;
  unlockAlphaMaskRef: RefObject<AlphaMaskData | null>;
  slotClassName?: string;
  enableUnlockHold?: boolean;
  onUnlockPointerDown?: () => void;
  onUnlockPointerEnd?: () => void;
  onImageDecoded?: () => void;
  onVisualReady?: () => void;
  impressionOverlay?: ReactNode;
  impressionGlitter?: boolean;
  impressionGlitterRevealPulse?: number;
  dedicatedBadgeGlitter?: boolean;
};

/**
 * Detail-panel badge stack: 3D viewer, optional locked overlay, unlock wave, drag + float.
 */
export function AchievementDetailBadgeInteractive({
  renderSrc,
  motionSeed,
  tone,
  FallbackIcon,
  hasIconUrl,
  iconAssetKind = "image",
  iconAssetPath = null,
  lockedUi,
  unlocking,
  floating,
  motionStartCentered = false,
  detailMaskStyle,
  unlockRevealClipPath,
  unlockAlphaMaskRef,
  slotClassName,
  enableUnlockHold = false,
  onUnlockPointerDown,
  onUnlockPointerEnd,
  onImageDecoded,
  onVisualReady,
  impressionOverlay,
  impressionGlitter = false,
  impressionGlitterRevealPulse = 0,
  dedicatedBadgeGlitter = false,
}: AchievementDetailBadgeInteractiveProps) {
  const showGlitter =
    dedicatedBadgeGlitter ||
    (IMPRESSION_GLITTER_UI_ENABLED && impressionGlitter);
  const glitterRevealPulse = dedicatedBadgeGlitter ? 0 : impressionGlitterRevealPulse;
  const isModelAsset = iconAssetKind === "model_glb" && Boolean(iconAssetPath?.trim());
  const { signedUrl: signedModelUrl } = useSignedBadgeModelUrl(
    iconAssetPath ?? "",
    hasIconUrl && isModelAsset && !lockedUi,
  );
  const glitterMaskStyle = renderSrc
    ? badgeImageMaskStylePadded(renderSrc, 108)
    : paddedBadgeMaskStyle(circularBadgeMaskStyle(), 108);

  return (
    <div className="relative">
      {impressionOverlay}
      <AchievementBadgeSlot size="detail" className={cn("relative", slotClassName)}>
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
            <div className="relative h-full w-full">
              {lockedUi ? (
                <RemoteBadgeImage
                  src={renderSrc}
                  className="h-full w-full object-contain p-1 opacity-80 grayscale"
                />
              ) : isModelAsset && signedModelUrl ? (
                <AchievementBadgeModelViewer
                  signedModelUrl={signedModelUrl}
                  previewSrc={renderSrc}
                  className="p-1"
                  float={floating}
                  motionSeed={motionSeed}
                  motionStartCentered={motionStartCentered}
                  onVisualReady={() => {
                    onImageDecoded?.();
                    onVisualReady?.();
                  }}
                />
              ) : (
                <AchievementBadge3DViewer
                  src={renderSrc}
                  className="p-1"
                  float={floating}
                  motionSeed={motionSeed}
                  motionStartCentered={motionStartCentered}
                  onImageDecoded={onImageDecoded}
                  onVisualReady={onVisualReady}
                  impressionGlitter={showGlitter && !lockedUi}
                  impressionGlitterRevealPulse={glitterRevealPulse}
                />
              )}
            </div>
            {isModelAsset && signedModelUrl && showGlitter && !lockedUi ? (
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
              <AchievementFallbackBadge
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
              <AchievementFallbackBadge
                tone={tone}
                isLocked={false}
                FallbackIcon={FallbackIcon}
                size="detail"
              />
            </UnlockRevealWave>
          </>
        )}
      </AchievementBadgeSlot>
    </div>
  );
}
