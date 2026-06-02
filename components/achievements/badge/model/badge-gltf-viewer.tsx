"use client";

import { useCallback, useEffectEvent, useMemo } from "react";

import { FloatingBadgeWrapper } from "@/components/achievements/badge/display/floating-badge-wrapper";
import { RemoteBadgeImage } from "@/components/achievements/badge/display/remote-badge-image";
import { useBadgeModelPreviewOverlay } from "@/components/achievements/badge/model/hooks/use-badge-model-preview-overlay";
import { useSignedBadgeModelUrl } from "@/components/achievements/badge/model/hooks/use-signed-badge-model-url";
import { BadgeModelCanvas } from "@/components/achievements/badge/model/r3f/badge-model-canvas";
import type { BadgeModelAsset } from "@/lib/achievements/badge/shared/badge-model-asset";
import { cn } from "@/lib/utils";

export type BadgeGltfViewerProps = {
  /**
   * Optimized badge poster URL (`toOptimizedRenderUrl` at the data/form boundary).
   * Shown while the GLB loads and on failure.
   */
  renderSrc: string | null;
  model: BadgeModelAsset;
  /** When set, render this GLB directly (embed, editor, server-resolved routes). */
  signedModelUrl?: string;
  onModelUrlReady?: () => void;
  className?: string;
  float: boolean;
  motionSeed?: string;
  motionStartCentered?: boolean;
  onVisualReady?: () => void;
  onPreviewDecoded?: () => void;
  stateKey?: string;
  showPreviewOverlay?: boolean;
  onHasAnimationChange?: (hasAnimation: boolean) => void;
  onPoseChange?: (yaw: number, pitch: number) => void;
  allowInertia?: boolean;
  interactive?: boolean;
};

/**
 * GLB badge: optional client signing from `model.assetPath`, poster until canvas is ready.
 */
export function BadgeGltfViewer({
  renderSrc,
  model,
  signedModelUrl: signedModelUrlProp,
  onModelUrlReady,
  className,
  float,
  motionSeed,
  motionStartCentered = false,
  onVisualReady,
  onPreviewDecoded,
  stateKey,
  showPreviewOverlay = true,
  onHasAnimationChange,
  onPoseChange,
  allowInertia = true,
  interactive = true,
}: BadgeGltfViewerProps) {
  const resolveFromAsset = !signedModelUrlProp?.trim();
  const { signedUrl: fetchedModelUrl } = useSignedBadgeModelUrl(
    model.assetPath,
    resolveFromAsset,
    onModelUrlReady,
  );
  const signedModelUrl = signedModelUrlProp?.trim() || fetchedModelUrl;

  if (!signedModelUrl) {
    if (!renderSrc) return null;
    return (
      <RemoteBadgeImage
        src={renderSrc}
        className={cn("h-full w-full object-contain", className)}
        onDecoded={onPreviewDecoded}
      />
    );
  }

  return (
    <BadgeGltfScene
      signedModelUrl={signedModelUrl}
      renderSrc={renderSrc}
      model={model}
      className={className}
      float={float}
      motionSeed={motionSeed}
      motionStartCentered={motionStartCentered}
      onVisualReady={onVisualReady}
      onPreviewDecoded={onPreviewDecoded}
      stateKey={stateKey}
      showPreviewOverlay={showPreviewOverlay}
      onHasAnimationChange={onHasAnimationChange}
      onPoseChange={onPoseChange}
      allowInertia={allowInertia}
      interactive={interactive}
    />
  );
}

type BadgeGltfSceneProps = {
  signedModelUrl: string;
  renderSrc: string | null;
  model: BadgeModelAsset;
  className?: string;
  float: boolean;
  motionSeed?: string;
  motionStartCentered?: boolean;
  onVisualReady?: () => void;
  onPreviewDecoded?: () => void;
  stateKey?: string;
  showPreviewOverlay?: boolean;
  onHasAnimationChange?: (hasAnimation: boolean) => void;
  onPoseChange?: (yaw: number, pitch: number) => void;
  allowInertia?: boolean;
  interactive?: boolean;
};

function BadgeGltfScene({
  signedModelUrl,
  renderSrc,
  model,
  className,
  float,
  motionSeed,
  motionStartCentered = false,
  onVisualReady,
  onPreviewDecoded,
  stateKey,
  showPreviewOverlay = true,
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
        {renderSrc ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-10 transition-opacity duration-200",
              previewVisible ? "opacity-100" : "opacity-0",
            )}
          >
            <RemoteBadgeImage
              src={renderSrc}
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
            model={model}
            className="h-full w-full"
            signedModelUrl={signedModelUrl}
            viewStateKey={viewStateKey}
            motionStartCentered={motionStartCentered}
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
