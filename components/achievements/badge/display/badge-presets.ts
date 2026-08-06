import type { CSSProperties, RefObject } from "react";

import type { AchievementTone } from "@/components/achievements/achievement-manager-utils";
import type { AchievementIconKey } from "@/components/achievements/achievement-editor-shared";
import type {
  BadgeGesture,
  BadgeImpression,
  BadgeOptions,
} from "@/components/achievements/badge/display/badge-options";
import type { BadgeModelAsset } from "@/lib/achievements/badge/shared/badge-model-asset";
import type { AlphaMaskData } from "@/lib/achievements/badge/parallax/shape-utils";
import type { AchievementViewModel } from "@/lib/achievements/presentation/collection-view-models";
import { cn } from "@/lib/utils";

export function badgeOptionsForGrid(params: {
  id: string;
  displaySrc: string | null;
  icon: AchievementIconKey;
  tone: AchievementTone;
  isLocked: boolean;
  dedicatedEffect: boolean;
}): BadgeOptions {
  return {
    frame: { kind: "slot", size: "grid" },
    content: { mode: "thumbnail" },
    displaySrc: params.displaySrc,
    icon: params.icon,
    tone: params.tone,
    locked: params.isLocked,
    dedicatedEffect: params.dedicatedEffect,
    silhouette: true,
    motionSeed: params.id,
    impressionEffect: false,
  };
}

export function badgeOptionsForFeedRow(params: {
  achievementId: string;
  displaySrc: string | null;
  icon: AchievementIconKey;
  tone: AchievementTone;
  dedicatedEffect: boolean;
  frameClassName?: string;
}): BadgeOptions {
  return {
    frame: {
      kind: "slot",
      size: "grid",
      className: params.frameClassName ?? "h-full w-full max-w-none",
    },
    content: { mode: "thumbnail" },
    displaySrc: params.displaySrc,
    icon: params.icon,
    tone: params.tone,
    locked: false,
    dedicatedEffect: params.dedicatedEffect,
    silhouette: true,
    motionSeed: params.achievementId,
    impressionEffect: false,
  };
}

export type DetailInteractiveBadgeOptionsParams = {
  renderSrc: string | null;
  motionSeed: string;
  tone: AchievementTone;
  detail: AchievementViewModel;
  viewerStateKey?: string;
  lockedUi: boolean;
  unlocking: boolean;
  floating?: boolean;
  motionStartCentered?: boolean;
  detailMaskStyle: CSSProperties | null;
  unlockRevealClipPathRef: RefObject<string>;
  unlockAlphaMaskRef: RefObject<AlphaMaskData | null>;
  slotClassName?: string;
  enableUnlockHold?: boolean;
  onUnlockPointerDown?: () => void;
  onUnlockPointerEnd?: () => void;
  onRefuseTap?: () => void;
  onPokeTap?: () => void;
  onImageDecoded?: () => void;
  onModelUrlReady?: () => void;
  onVisualReady?: () => void;
  impression?: BadgeImpression;
  dedicatedEffect: boolean;
  impressionEffect: boolean;
};

export function badgeOptionsForDetailInteractive(
  params: DetailInteractiveBadgeOptionsParams,
): BadgeOptions {
  const hasModel = params.detail.model != null;
  return {
    frame: {
      kind: "slot",
      size: "detail",
      className: cn("relative", params.slotClassName),
    },
    content: {
      mode: "interactive",
      viewerStateKey: params.viewerStateKey,
      onImageDecoded: params.onImageDecoded,
      onModelUrlReady: params.onModelUrlReady,
      onVisualReady: params.onVisualReady,
      motionStartCentered: params.motionStartCentered,
    },
    displaySrc: params.renderSrc,
    icon: params.detail.icon,
    tone: params.tone,
    model: params.detail.model,
    locked: params.lockedUi,
    dedicatedEffect: params.dedicatedEffect && !hasModel,
    silhouette: false,
    float: params.floating ?? true,
    motionSeed: params.motionSeed,
    unlock: {
      active: params.unlocking,
      clipPathRef: params.unlockRevealClipPathRef,
      maskStyle: params.detailMaskStyle,
    },
    gesture: resolveDetailBadgeGesture(params),
    impression: params.impression,
    impressionEffect: params.impressionEffect && !params.lockedUi && !hasModel,
  };
}

function resolveDetailBadgeGesture(
  params: DetailInteractiveBadgeOptionsParams,
): BadgeGesture | null {
  if (params.enableUnlockHold && params.lockedUi) {
    return {
      kind: "unlock-hold",
      alphaMaskRef: params.unlockAlphaMaskRef,
      onPointerDown: params.onUnlockPointerDown,
      onPointerEnd: params.onUnlockPointerEnd,
    };
  }

  if (params.unlocking) return null;

  if (params.lockedUi && params.onRefuseTap) {
    return {
      kind: "refuse-tap",
      alphaMaskRef: params.unlockAlphaMaskRef,
      onTap: params.onRefuseTap,
    };
  }

  if (!params.lockedUi && params.onPokeTap) {
    return {
      kind: "poke-tap",
      onTap: params.onPokeTap,
    };
  }

  return null;
}

export function badgeOptionsForEditor(params: {
  renderSrc: string | null;
  icon: AchievementIconKey;
  tone: AchievementTone;
  model: BadgeModelAsset | null;
  isLocked: boolean;
  motionSeed: string;
  busy: boolean;
  allowModelRotation: boolean;
  onHasAnimationChange: (hasAnimation: boolean) => void;
  onPoseChange: (yaw: number, pitch: number) => void;
}): BadgeOptions {
  return {
    frame: { kind: "none", className: "h-full w-full" },
    content: {
      mode: "editor",
      onHasAnimationChange: params.onHasAnimationChange,
      onPoseChange: params.onPoseChange,
      allowModelRotation: params.allowModelRotation,
      imageClassName: "drop-shadow-lg transition-all duration-500 ease-out",
      busy: params.busy,
    },
    displaySrc: params.renderSrc,
    icon: params.icon,
    tone: params.tone,
    model: params.model,
    locked: params.isLocked,
    dedicatedEffect: false,
    silhouette: false,
    float: true,
    motionSeed: params.motionSeed,
    impressionEffect: false,
  };
}

export function badgeOptionsForEmbed(params: {
  achievementId: string;
  displaySrc: string;
  model: BadgeModelAsset | null;
  signedModelUrl: string | null;
  frameClassName?: string;
}): BadgeOptions {
  return {
    frame: {
      kind: "none",
      className: params.frameClassName ?? "h-full w-full",
    },
    content: { mode: "interactive" },
    displaySrc: params.displaySrc,
    icon: "award",
    tone: "teal",
    model: params.model,
    signedModelUrl: params.signedModelUrl,
    dedicatedEffect: false,
    silhouette: false,
    float: true,
    motionSeed: params.achievementId,
    allowFallback: false,
    impressionEffect: false,
  };
}

export function badgeOptionsForInvite(params: {
  inviteId: string;
  displaySrc: string;
  model: BadgeModelAsset | null;
  signedModelUrl: string | null;
  frameClassName?: string;
}): BadgeOptions {
  return badgeOptionsForEmbed({
    achievementId: params.inviteId,
    displaySrc: params.displaySrc,
    model: params.model,
    signedModelUrl: params.signedModelUrl,
    frameClassName: params.frameClassName ?? "mx-auto h-full w-full",
  });
}
