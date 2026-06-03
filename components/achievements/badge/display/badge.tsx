"use client";

import { useMemo, type ReactNode } from "react";

import { BadgeSlot } from "@/components/achievements/badge/chrome/badge-slot";
import { BadgeSilhouetteShadow } from "@/components/achievements/badge/display/badge-silhouette";
import {
  resolveBadgeGlitterVariant,
  slotSizeFromFrame,
  type BadgeOptions,
} from "@/components/achievements/badge/display/badge-options";
import { FallbackBadge } from "@/components/achievements/badge/display/fallback-badge";
import { FloatingBadgeWrapper } from "@/components/achievements/badge/display/floating-badge-wrapper";
import { RemoteBadgeImage } from "@/components/achievements/badge/display/remote-badge-image";
import { ImpressionGlitterField } from "@/components/achievements/badge/effects/impression-glitter-field";
import { UnlockRevealWave } from "@/components/achievements/badge/effects/unlock-reveal-wave";
import { useBadgeModelPreviewOverlay } from "@/components/achievements/badge/model/hooks/use-badge-model-preview-overlay";
import {
  BadgeGltfViewer,
  useBadgeGltfSignedUrl,
} from "@/components/achievements/badge/model/badge-gltf-viewer";
import { BadgeParallaxViewer } from "@/components/achievements/badge/parallax/badge-parallax-viewer";
import {
  badgeImageMaskStylePadded,
  circularBadgeMaskStyle,
  paddedBadgeMaskStyle,
} from "@/lib/achievements/badge/parallax/badge-mask-style";
import { isOpaqueBadgeHit } from "@/lib/achievements/badge/parallax/shape-utils";
import { cn } from "@/lib/utils";

type BadgeProps = {
  options: BadgeOptions;
};

type ContentPhase = "base" | "reveal";

export function Badge({ options }: BadgeProps) {
  const {
    frame,
    content,
    displaySrc,
    icon,
    tone,
    model,
    signedModelUrl: signedModelUrlProp,
    locked = false,
    glitter = "none",
    silhouette = true,
    float = false,
    motionSeed,
    allowFallback = true,
    unlock,
    impressionOverlay,
    className,
    wrapStack,
  } = options;

  const slotSize = slotSizeFromFrame(frame);
  const glitterVariant = resolveBadgeGlitterVariant(frame);
  const isInteractive = content.mode === "interactive";
  const isEditor = content.mode === "editor";
  const showSilhouette = silhouette && !!displaySrc && !locked;

  const interactiveCallbacks =
    content.mode === "interactive" ? content : undefined;
  const editorCallbacks = content.mode === "editor" ? content : undefined;

  const signedModelUrl = useBadgeGltfSignedUrl(
    model,
    signedModelUrlProp,
    interactiveCallbacks?.onModelUrlReady ?? editorCallbacks?.onModelUrlReady,
  );

  const useGlbStack =
    !!model && !!signedModelUrl && (isInteractive || isEditor);
  const showGlbPoster = useGlbStack && !!displaySrc;

  const { ready, previewVisible, handleVisualReady, handleLoadError } =
    useBadgeModelPreviewOverlay({
      signedModelUrl: signedModelUrl ?? "",
      showPreviewOverlay: editorCallbacks?.showPreviewOverlay ?? true,
      onVisualReady: interactiveCallbacks?.onVisualReady,
    });

  const glitterMaskStyle = useMemo(
    () =>
      displaySrc
        ? badgeImageMaskStylePadded(displaySrc, 108)
        : paddedBadgeMaskStyle(circularBadgeMaskStyle(), 108),
    [displaySrc],
  );

  const glitterRevealPulse =
    glitter === "impression"
      ? (interactiveCallbacks?.impressionGlitterRevealPulse ?? 0)
      : 0;

  const floatSourceKey = signedModelUrl ?? displaySrc ?? motionSeed;
  const floatSeed = signedModelUrl
    ? resolveTrimmedKey(motionSeed, signedModelUrl, "badge-model")
    : resolveTrimmedKey(motionSeed, displaySrc, "badge");

  function renderContent(phase: ContentPhase): ReactNode {
    const phaseLocked = phase === "reveal" ? false : locked;
    const imageClassName = cn(
      "h-full w-full object-contain p-1",
      phaseLocked && "opacity-80 grayscale",
      editorCallbacks?.imageClassName,
      editorCallbacks?.busy && "scale-[0.96] blur-[3.5px] opacity-[0.72]",
    );

    if (!displaySrc) {
      if (!allowFallback) return null;
      return (
        <FallbackBadge
          tone={tone}
          isLocked={phaseLocked}
          icon={icon}
          size={slotSize}
        />
      );
    }

    if (phaseLocked) {
      return (
        <RemoteBadgeImage
          src={displaySrc}
          className={imageClassName}
          onDecoded={interactiveCallbacks?.onImageDecoded}
        />
      );
    }

    if (model && signedModelUrl && (isInteractive || isEditor)) {
      const glbNode = (
        <div
          className={cn(
            "relative h-full w-full",
            editorCallbacks?.busy && "transition-all duration-500 ease-out",
          )}
        >
          {showGlbPoster ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-0 z-10 p-1 transition-opacity duration-200",
                previewVisible ? "opacity-100" : "opacity-0",
              )}
            >
              <RemoteBadgeImage
                src={displaySrc}
                className="h-full w-full object-contain"
                onDecoded={interactiveCallbacks?.onImageDecoded}
              />
            </div>
          ) : null}
          <BadgeGltfViewer
            model={model}
            signedModelUrl={signedModelUrl}
            className={cn(isEditor && "p-1")}
            motionSeed={motionSeed}
            motionStartCentered={interactiveCallbacks?.motionStartCentered}
            stateKey={interactiveCallbacks?.viewerStateKey}
            onVisualReady={interactiveCallbacks?.onVisualReady}
            onVisualReadyFromCanvas={handleVisualReady}
            onLoadError={handleLoadError}
            onHasAnimationChange={editorCallbacks?.onHasAnimationChange}
            onPoseChange={editorCallbacks?.onPoseChange}
            allowInertia={!isEditor}
            interactive={editorCallbacks?.allowModelRotation ?? true}
            ready={ready}
          />
        </div>
      );
      return isInteractive ? wrapLiveFloat(glbNode, interactiveCallbacks?.motionStartCentered) : glbNode;
    }

    if (model && displaySrc && (isInteractive || isEditor) && !signedModelUrl) {
      return (
        <RemoteBadgeImage
          src={displaySrc}
          className={imageClassName}
          onDecoded={interactiveCallbacks?.onImageDecoded}
        />
      );
    }

    if (isInteractive && displaySrc) {
      const parallax = (
        <BadgeParallaxViewer
          src={displaySrc}
          className="p-1"
          motionSeed={motionSeed}
          onImageDecoded={interactiveCallbacks?.onImageDecoded}
          onVisualReady={interactiveCallbacks?.onVisualReady}
        />
      );
      return wrapLiveFloat(parallax, interactiveCallbacks?.motionStartCentered);
    }

    return (
      <RemoteBadgeImage
        src={displaySrc}
        className={cn(
          content.mode === "thumbnail" ? "h-full w-full" : imageClassName,
          isEditor && "drop-shadow-lg transition-all duration-500 ease-out p-1",
        )}
        onDecoded={interactiveCallbacks?.onImageDecoded}
      />
    );
  }

  function wrapLiveFloat(node: ReactNode, motionStartCentered?: boolean) {
    if (!float) return node;
    return (
      <FloatingBadgeWrapper
        motionSeed={floatSeed}
        sourceKey={floatSourceKey}
        motionStartCentered={motionStartCentered}
        fallbackSeed={signedModelUrl ? "badge-model" : "badge"}
      >
        {node}
      </FloatingBadgeWrapper>
    );
  }

  const baseStack = (
    <div className={cn("relative h-full w-full", className)}>
      {showSilhouette ? <BadgeSilhouetteShadow src={displaySrc!} /> : null}
      <div
        className={cn(
          "relative h-full w-full",
          locked && "opacity-70 grayscale",
        )}
      >
        {renderContent("base")}
      </div>
      {glitter !== "none" && displaySrc ? (
        <ImpressionGlitterField
          active
          motionSeed={motionSeed}
          maskStyle={glitterMaskStyle}
          revealPulse={glitterRevealPulse}
          variant={glitterVariant}
          overlay
          className={cn(
            glitterVariant === "grid" ? "z-[12]" : "z-[18]",
          )}
        />
      ) : null}
      {unlock ? (
        <UnlockRevealWave
          isUnlocking={unlock.active}
          detailMaskStyle={unlock.maskStyle}
          unlockRevealClipPath={unlock.clipPath}
          reveal={
            <div className="relative h-full w-full">
              {renderContent("reveal")}
            </div>
          }
        />
      ) : null}
    </div>
  );

  const stack = wrapStack ? wrapStack(baseStack) : baseStack;

  const unlockHold =
    unlock?.hold?.enabled && locked ? (
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
              unlock.hold!.alphaMaskRef.current,
              "filled",
            )
          ) {
            return;
          }
          unlock.hold!.onPointerDown?.();
        }}
        onPointerUp={unlock.hold!.onPointerEnd}
        onPointerLeave={unlock.hold!.onPointerEnd}
        onPointerCancel={unlock.hold!.onPointerEnd}
        onContextMenu={(e) => e.preventDefault()}
      />
    ) : null;

  const inner = (
    <>
      {unlockHold}
      {stack}
    </>
  );

  const framed =
    frame.kind === "slot" ? (
      <BadgeSlot size={frame.size} className={frame.className}>
        {inner}
      </BadgeSlot>
    ) : (
      <div
        className={cn(
          "relative h-full w-full min-h-0 min-w-0",
          frame.className,
        )}
      >
        {inner}
      </div>
    );

  if (impressionOverlay) {
    return (
      <div className="relative">
        {impressionOverlay}
        {framed}
      </div>
    );
  }

  return framed;
}

function resolveTrimmedKey(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const normalized = candidate?.trim();
    if (normalized) return normalized;
  }
  return "";
}
