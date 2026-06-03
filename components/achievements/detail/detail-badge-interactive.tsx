"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { Badge } from "@/components/achievements/badge/display/badge";
import type {
  BadgeGlitter,
  BadgeOptions,
} from "@/components/achievements/badge/display/badge-options";
import type { AchievementTone } from "@/components/achievements/achievement-manager-utils";
import type { AchievementIconKey } from "@/components/achievements/achievement-editor-shared";
import type { AlphaMaskData } from "@/lib/achievements/badge/parallax/shape-utils";
import { cn } from "@/lib/utils";
import type { AchievementDetailViewModel } from "@/lib/achievements/data/achievement-view-models";

export type DetailBadgeInteractiveProps = {
  renderSrc: string | null;
  motionSeed: string;
  tone: AchievementTone;
  detail: AchievementDetailViewModel;
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

function resolveDetailGlitter(
  dedicatedBadgeGlitter: boolean,
  impressionGlitter: boolean,
): BadgeGlitter {
  if (dedicatedBadgeGlitter) return "dedicated";
  if (
    process.env.NEXT_PUBLIC_IMPRESSION_GLITTER_UI_ENABLED === "true" &&
    impressionGlitter
  ) {
    return "impression";
  }
  return "none";
}

export function DetailBadgeInteractive({
  renderSrc,
  motionSeed,
  tone,
  detail,
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
  const options: BadgeOptions = {
    frame: {
      kind: "slot",
      size: "detail",
      className: cn("relative", slotClassName),
    },
    content: {
      mode: "interactive",
      viewerStateKey,
      onImageDecoded,
      onModelUrlReady,
      onVisualReady,
      motionStartCentered,
      impressionGlitterRevealPulse,
    },
    displaySrc: renderSrc,
    icon: detail.icon,
    tone,
    model: detail.model,
    locked: lockedUi,
    glitter: resolveDetailGlitter(dedicatedBadgeGlitter, impressionGlitter),
    silhouette: false,
    float: floating,
    motionSeed,
    unlock: {
      active: unlocking,
      clipPath: unlockRevealClipPath,
      maskStyle: detailMaskStyle,
      hold: enableUnlockHold
        ? {
            enabled: true,
            onPointerDown: onUnlockPointerDown,
            onPointerEnd: onUnlockPointerEnd,
            alphaMaskRef: unlockAlphaMaskRef,
          }
        : undefined,
    },
    impressionOverlay,
  };

  return <Badge options={options} />;
}
