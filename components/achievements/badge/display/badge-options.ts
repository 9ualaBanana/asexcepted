import type { CSSProperties, ReactNode, RefObject } from "react";

import type { AchievementTone } from "@/components/achievements/achievement-manager-utils";
import type { AchievementIconKey } from "@/components/achievements/achievement-editor-shared";
import type { BadgeModelAsset } from "@/lib/achievements/badge/shared/badge-model-asset";
import type { AlphaMaskData } from "@/lib/achievements/badge/parallax/shape-utils";

export type BadgeFrame =
  | { kind: "slot"; size: "grid" | "detail"; className?: string }
  | { kind: "none"; className?: string };

export type BadgeGlitter = "none" | "dedicated" | "impression";

export type BadgeContent =
  | { mode: "thumbnail" }
  | {
      mode: "interactive";
      viewerStateKey?: string;
      onImageDecoded?: () => void;
      onModelUrlReady?: () => void;
      onVisualReady?: () => void;
      motionStartCentered?: boolean;
      impressionGlitterRevealPulse?: number;
    }
  | {
      mode: "editor";
      signedModelUrl?: string | null;
      onModelUrlReady?: () => void;
      onHasAnimationChange?: (hasAnimation: boolean) => void;
      onPoseChange?: (yaw: number, pitch: number) => void;
      allowModelRotation?: boolean;
      showPreviewOverlay?: boolean;
      imageClassName?: string;
      busy?: boolean;
    };

export type BadgeUnlock = {
  active: boolean;
  clipPath: string;
  maskStyle: CSSProperties | null;
  hold?: {
    enabled: boolean;
    onPointerDown?: () => void;
    onPointerEnd?: () => void;
    alphaMaskRef: RefObject<AlphaMaskData | null>;
  };
};

export type BadgeOptions = {
  frame: BadgeFrame;
  content: BadgeContent;
  displaySrc: string | null;
  icon: AchievementIconKey;
  tone: AchievementTone;
  model?: BadgeModelAsset | null;
  signedModelUrl?: string | null;
  locked?: boolean;
  glitter?: BadgeGlitter;
  silhouette?: boolean;
  float?: boolean;
  motionSeed: string;
  allowFallback?: boolean;
  unlock?: BadgeUnlock | null;
  impressionOverlay?: ReactNode;
  className?: string;
  /** Wraps the inner stack (e.g. editor upload button). Applied inside the frame. */
  wrapStack?: (stack: ReactNode) => ReactNode;
};

export function resolveBadgeGlitterVariant(
  frame: BadgeFrame,
): "grid" | "detail" {
  return frame.kind === "slot" && frame.size === "grid" ? "grid" : "detail";
}

export function slotSizeFromFrame(
  frame: BadgeFrame,
): "grid" | "detail" {
  return frame.kind === "slot" ? frame.size : "detail";
}
