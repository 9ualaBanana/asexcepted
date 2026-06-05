"use client";

import { useCallback, useEffectEvent, useMemo } from "react";

import { useSignedBadgeModelUrl } from "@/components/achievements/badge/display/gltf/hooks/use-signed-badge-model-url";
import { BadgeModelCanvas } from "@/components/achievements/badge/display/gltf/r3f/badge-model-canvas";
import type { BadgeModelAsset } from "@/lib/achievements/badge/shared/badge-model-asset";
import { cn } from "@/lib/utils";

export type BadgeGltfViewerProps = {
  model: BadgeModelAsset;
  signedModelUrl: string;
  className?: string;
  motionSeed?: string;
  motionStartCentered?: boolean;
  onVisualReady?: () => void;
  stateKey?: string;
  onHasAnimationChange?: (hasAnimation: boolean) => void;
  onPoseChange?: (yaw: number, pitch: number) => void;
  allowInertia?: boolean;
  interactive?: boolean;
  ready?: boolean;
  onVisualReadyFromCanvas?: () => void;
  onLoadError?: () => void;
};

/** GLB canvas only — poster, float, and signing are composed by `Badge`. */
export function BadgeGltfViewer({
  model,
  signedModelUrl,
  className,
  motionSeed,
  motionStartCentered = false,
  onVisualReady,
  stateKey,
  onHasAnimationChange,
  onPoseChange,
  allowInertia = true,
  interactive = true,
  ready = true,
  onVisualReadyFromCanvas,
  onLoadError,
}: BadgeGltfViewerProps) {
  const notifyVisualReady = useEffectEvent(() => onVisualReady?.());
  const notifyHasAnimationChange = useEffectEvent((has: boolean) =>
    onHasAnimationChange?.(has),
  );
  const notifyPoseChange = useEffectEvent((yaw: number, pitch: number) =>
    onPoseChange?.(yaw, pitch),
  );

  const viewStateKey = useMemo(
    () => resolveTrimmedKey(stateKey, motionSeed, signedModelUrl),
    [motionSeed, signedModelUrl, stateKey],
  );

  const handleVisualReady = useCallback(() => {
    if (onVisualReadyFromCanvas) {
      onVisualReadyFromCanvas();
      return;
    }
    notifyVisualReady();
  }, [notifyVisualReady, onVisualReadyFromCanvas]);

  const handleLoadErrorWithAnimationReset = useCallback(() => {
    onLoadError?.();
    notifyHasAnimationChange(false);
  }, [notifyHasAnimationChange, onLoadError]);

  return (
    <div className={cn("relative h-full w-full p-1", className)}>
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
  );
}

/** Client signing when `Badge` has a model but no pre-resolved URL. */
export function useBadgeGltfSignedUrl(
  model: BadgeModelAsset | null | undefined,
  signedModelUrlProp: string | null | undefined,
  onModelUrlReady?: () => void,
) {
  const resolveFromAsset = !signedModelUrlProp?.trim();
  const { signedUrl: fetchedModelUrl } = useSignedBadgeModelUrl(
    model?.assetPath ?? "",
    resolveFromAsset && !!model?.assetPath?.trim(),
    onModelUrlReady,
  );
  return signedModelUrlProp?.trim() || fetchedModelUrl || null;
}

function resolveTrimmedKey(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const normalized = candidate?.trim();
    if (normalized) return normalized;
  }
  return "";
}
