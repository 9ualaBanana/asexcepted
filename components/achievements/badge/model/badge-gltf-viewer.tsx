"use client";

import { useCallback, useEffectEvent, useMemo } from "react";

import { FloatingBadgeWrapper } from "@/components/achievements/badge/display/floating-badge-wrapper";
import { RemoteBadgeImage } from "@/components/achievements/badge/display/remote-badge-image";
import { useBadgeModelPreviewOverlay } from "@/components/achievements/badge/model/hooks/use-badge-model-preview-overlay";
import { useSignedBadgeModelUrl } from "@/components/achievements/badge/model/hooks/use-signed-badge-model-url";
import { BadgeModelCanvas } from "@/components/achievements/badge/model/r3f/badge-model-canvas";
import { cn } from "@/lib/utils";

export type BadgeGltfViewerProps = {
  /** Poster / flat image shown while the GLB loads (and on failure). */
  previewSrc: string;
  /** When set, render this GLB directly (embed, editor, server-resolved routes). */
  signedModelUrl?: string;
  /** When set without `signedModelUrl`, fetch a signed GLB URL client-side. */
  iconAssetPath?: string;
  onModelUrlReady?: () => void;
  className?: string;
  float?: boolean;
  motionSeed?: string;
  motionStartCentered?: boolean;
  initialYaw?: number;
  initialPitch?: number;
  onVisualReady?: () => void;
  onPreviewDecoded?: () => void;
  stateKey?: string;
  showPreviewOverlay?: boolean;
  playAnimation?: boolean;
  animationSpeed?: number;
  onHasAnimationChange?: (hasAnimation: boolean) => void;
  onPoseChange?: (yaw: number, pitch: number) => void;
  allowInertia?: boolean;
  interactive?: boolean;
};

/**
 * GLB badge: optional client signing from `iconAssetPath`, poster until canvas is ready.
 */
export function BadgeGltfViewer({
  previewSrc,
  signedModelUrl: signedModelUrlProp,
  iconAssetPath,
  onModelUrlReady,
  className,
  float = false,
  motionSeed,
  motionStartCentered = false,
  initialYaw = 0,
  initialPitch = 0,
  onVisualReady,
  onPreviewDecoded,
  stateKey,
  showPreviewOverlay = true,
  playAnimation = true,
  animationSpeed = 1,
  onHasAnimationChange,
  onPoseChange,
  allowInertia = true,
  interactive = true,
}: BadgeGltfViewerProps) {
  const normalizedPreviewSrc = useMemo(() => previewSrc.trim(), [previewSrc]);
  const resolveFromAsset =
    !signedModelUrlProp?.trim() && Boolean(iconAssetPath?.trim());
  const { signedUrl: fetchedModelUrl } = useSignedBadgeModelUrl(
    iconAssetPath ?? "",
    resolveFromAsset,
    onModelUrlReady,
  );
  const signedModelUrl = signedModelUrlProp?.trim() || fetchedModelUrl;

  if (!signedModelUrl) {
    if (!normalizedPreviewSrc) return null;
    return (
      <RemoteBadgeImage
        src={normalizedPreviewSrc}
        className={cn("h-full w-full object-contain", className)}
        onDecoded={onPreviewDecoded}
      />
    );
  }

  return (
    <BadgeGltfScene
      signedModelUrl={signedModelUrl}
      previewSrc={normalizedPreviewSrc}
      className={className}
      float={float}
      motionSeed={motionSeed}
      motionStartCentered={motionStartCentered}
      initialYaw={initialYaw}
      initialPitch={initialPitch}
      onVisualReady={onVisualReady}
      onPreviewDecoded={onPreviewDecoded}
      stateKey={stateKey}
      showPreviewOverlay={showPreviewOverlay}
      playAnimation={playAnimation}
      animationSpeed={animationSpeed}
      onHasAnimationChange={onHasAnimationChange}
      onPoseChange={onPoseChange}
      allowInertia={allowInertia}
      interactive={interactive}
    />
  );
}

type BadgeGltfSceneProps = {
  signedModelUrl: string;
  previewSrc: string;
  className?: string;
  float?: boolean;
  motionSeed?: string;
  motionStartCentered?: boolean;
  initialYaw?: number;
  initialPitch?: number;
  onVisualReady?: () => void;
  onPreviewDecoded?: () => void;
  stateKey?: string;
  showPreviewOverlay?: boolean;
  playAnimation?: boolean;
  animationSpeed?: number;
  onHasAnimationChange?: (hasAnimation: boolean) => void;
  onPoseChange?: (yaw: number, pitch: number) => void;
  allowInertia?: boolean;
  interactive?: boolean;
};

function BadgeGltfScene({
  signedModelUrl,
  previewSrc,
  className,
  float = false,
  motionSeed,
  motionStartCentered = false,
  initialYaw = 0,
  initialPitch = 0,
  onVisualReady,
  onPreviewDecoded,
  stateKey,
  showPreviewOverlay = true,
  playAnimation = true,
  animationSpeed = 1,
  onHasAnimationChange,
  onPoseChange,
  allowInertia = true,
  interactive = true,
}: BadgeGltfSceneProps) {
  const notifyVisualReady = useEffectEvent(() => onVisualReady?.());
  const notifyPreviewDecoded = useEffectEvent(() => onPreviewDecoded?.());
  const notifyHasAnimationChange = useEffectEvent((has: boolean) => onHasAnimationChange?.(has));
  const notifyPoseChange = useEffectEvent((yaw: number, pitch: number) => onPoseChange?.(yaw, pitch));

  const { ready, previewVisible, handleVisualReady, handleLoadError } =
    useBadgeModelPreviewOverlay({
      signedModelUrl,
      showPreviewOverlay,
      onVisualReady: notifyVisualReady,
    });

  const viewStateKey = useMemo(
    () => resolveTrimmedKey(stateKey, motionSeed, signedModelUrl),
    [motionSeed, signedModelUrl, stateKey],
  );
  const floatSeed = useMemo(
    () => resolveTrimmedKey(motionSeed, signedModelUrl, "badge-model"),
    [motionSeed, signedModelUrl],
  );

  const handleLoadErrorWithAnimationReset = useCallback(() => {
    handleLoadError();
    notifyHasAnimationChange(false);
  }, [handleLoadError, notifyHasAnimationChange]);

  const viewer = (
    <div className={cn("relative h-full w-full", className)}>
      <div className="relative h-full w-full p-1">
        {previewSrc ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-10 transition-opacity duration-200",
              previewVisible ? "opacity-100" : "opacity-0",
            )}
          >
            <RemoteBadgeImage
              src={previewSrc}
              className="h-full w-full object-contain"
              onDecoded={notifyPreviewDecoded}
            />
          </div>
        ) : null}
        <div
          className={cn(
            "h-full w-full touch-none transition-opacity duration-300",
            !interactive && "cursor-default",
            !ready && "opacity-0",
          )}
        >
          <BadgeModelCanvas
            className="h-full w-full"
            signedModelUrl={signedModelUrl}
            viewStateKey={viewStateKey}
            initialYaw={initialYaw}
            initialPitch={initialPitch}
            motionStartCentered={motionStartCentered}
            playAnimation={playAnimation}
            animationSpeed={animationSpeed}
            interactive={interactive}
            allowInertia={allowInertia}
            onPoseChange={notifyPoseChange}
            onHasAnimationChange={notifyHasAnimationChange}
            onVisualReady={handleVisualReady}
            onLoadError={handleLoadErrorWithAnimationReset}
          />
        </div>
      </div>
    </div>
  );

  if (!float) return viewer;

  return (
    <FloatingBadgeWrapper
      motionSeed={floatSeed}
      sourceKey={signedModelUrl}
      motionStartCentered={motionStartCentered}
      fallbackSeed="badge-model"
    >
      {viewer}
    </FloatingBadgeWrapper>
  );
}

function resolveTrimmedKey(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const normalized = candidate?.trim();
    if (normalized) return normalized;
  }
  return "";
}
