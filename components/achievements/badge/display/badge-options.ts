import type { CSSProperties, RefObject } from "react";

import type { AchievementTone } from "@/components/achievements/achievement-manager-utils";
import type { AchievementIconKey } from "@/components/achievements/achievement-editor-shared";
import type { BadgeModelAsset } from "@/lib/achievements/badge/shared/badge-model-asset";
import type { AlphaMaskData } from "@/lib/achievements/badge/parallax/shape-utils";

export type BadgeFrame =
  | { kind: "slot"; size: "grid" | "detail"; className?: string }
  | { kind: "none"; className?: string };

export type BadgeContent =
  | { mode: "thumbnail" }
  | {
      mode: "interactive";
      viewerStateKey?: string;
      onImageDecoded?: () => void;
      onModelUrlReady?: () => void;
      onVisualReady?: () => void;
      motionStartCentered?: boolean;
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

export type BadgeImpression = {
  /** Show burst overlay and wire double-tap / double-click activation. */
  burstEnabled: boolean;
  activateDisabled?: boolean;
  onActivate?: () => void;
};

/** Props for memoized GLB / parallax / flat live art (shared by lock + underlay). */
export type BadgeLiveVisual = {
  displaySrc: string | null;
  model?: BadgeModelAsset | null;
  signedModelUrl?: string | null;
  motionSeed: string;
  float: boolean;
  content: BadgeContent;
};

export type BadgeUnlock = {
  active: boolean;
  /** Updated imperatively during reveal — avoids re-rendering Badge every frame. */
  clipPathRef: RefObject<string>;
  maskStyle: CSSProperties | null;
};

/**
 * Single in-badge gesture surface (owned by {@link BadgeGestureLayer}).
 * Mutually exclusive modes — set by detail presets from surface state.
 */
export type BadgeGesture =
  | {
      kind: "unlock-hold";
      alphaMaskRef: RefObject<AlphaMaskData | null>;
      onPointerDown?: () => void;
      onPointerEnd?: () => void;
    }
  | {
      kind: "refuse-tap";
      alphaMaskRef: RefObject<AlphaMaskData | null>;
      onTap: () => void;
    }
  | {
      kind: "poke-tap";
      onTap: () => void;
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
  dedicatedEffect: boolean;
  silhouette?: boolean;
  float?: boolean;
  /** Stable per-badge id for float / glitter / impression effect (usually achievement id). */
  motionSeed: string;
  allowFallback?: boolean;
  unlock?: BadgeUnlock | null;
  gesture?: BadgeGesture | null;
  impression?: BadgeImpression;
  impressionEffect: boolean;
  className?: string;
};

/** Live art + silhouette / underlay / dedicated-effect inputs for the locked core stack. */
export type BadgeArtProps = BadgeLiveVisual & {
  className?: string;
  silhouette: boolean;
  locked: boolean;
  allowFallback: boolean;
  icon: AchievementIconKey;
  tone: AchievementTone;
  frame: BadgeFrame;
  dedicatedEffect: boolean;
  impressionEffect: boolean;
};

export function badgeArtFromOptions(options: BadgeOptions): BadgeArtProps {
  return {
    displaySrc: options.displaySrc,
    model: options.model,
    signedModelUrl: options.signedModelUrl,
    motionSeed: options.motionSeed,
    float: options.float ?? false,
    content: options.content,
    className: options.className,
    silhouette: options.silhouette ?? true,
    locked: options.locked ?? false,
    allowFallback: options.allowFallback ?? true,
    icon: options.icon,
    tone: options.tone,
    frame: options.frame,
    dedicatedEffect: options.dedicatedEffect,
    impressionEffect: options.impressionEffect,
  };
}

export function resolveBadgeEffectDensity(
  frame: BadgeFrame,
): "grid" | "detail" {
  return frame.kind === "slot" && frame.size === "grid" ? "grid" : "detail";
}

export function slotSizeFromFrame(
  frame: BadgeFrame,
): "grid" | "detail" {
  return frame.kind === "slot" ? frame.size : "detail";
}

/** Unlocked badge with `displaySrc` — one of three renderers. */
export type BadgeLiveVisualMode = "glb" | "parallax" | "flat";

export function getBadgeContentMode(content: BadgeContent) {
  const isInteractive = content.mode === "interactive";
  const isEditor = content.mode === "editor";

  return {
    mode: content.mode,
    isInteractive,
    isEditor,
    isLiveViewer: isInteractive || isEditor,
    interactive: isInteractive ? content : undefined,
    editor: isEditor ? content : undefined,
  };
}

export function resolveLiveVisualMode(params: {
  hasDisplaySrc: boolean;
  hasModel: boolean;
  hasSignedModelUrl: boolean;
  isLiveViewer: boolean;
}): BadgeLiveVisualMode {
  const useGlbStack =
    params.hasDisplaySrc &&
    params.hasModel &&
    params.hasSignedModelUrl &&
    params.isLiveViewer;

  if (useGlbStack) return "glb";

  if (params.isLiveViewer && params.hasDisplaySrc) return "parallax";

  return "flat";
}
