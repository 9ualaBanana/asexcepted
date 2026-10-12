"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";

import { useBadgeGltfSource } from "@/components/achievements/badge/display/gltf/hooks/use-badge-gltf-source";
import { useSignedBadgeModelUrl } from "@/components/achievements/badge/display/gltf/hooks/use-signed-badge-model-url";
import { BadgeModelCanvas } from "@/components/achievements/badge/display/gltf/r3f/badge-model-canvas";
import type { BadgeModelAsset } from "@/lib/achievements/badge/shared/badge-model-asset";
import { cn } from "@/lib/utils";

export type BadgeGltfViewerProps = {
  model: BadgeModelAsset;
  signedModelUrl: string;
  className?: string;
  motionSeed: string;
  motionStartCentered?: boolean;
  onVisualReady?: () => void;
  stateKey?: string;
  onHasAnimationChange?: (hasAnimation: boolean) => void;
  onPoseChange?: (yaw: number, pitch: number) => void;
  allowInertia?: boolean;
  interactive?: boolean;
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

  const hostRef = useRef<HTMLDivElement>(null);
  const painted = usePaintedHost(hostRef);
  const { gltf, error } = useBadgeGltfSource(signedModelUrl);
  const viewStateKey = stateKey?.trim() || motionSeed;

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

  useEffect(() => {
    if (!error) return;
    handleLoadErrorWithAnimationReset();
  }, [error, handleLoadErrorWithAnimationReset]);

  return (
    <div ref={hostRef} className={cn("relative h-full w-full p-1", className)}>
      <div
        className={cn(
          "h-full w-full touch-none",
          !interactive && "cursor-default",
        )}
      >
        {painted && !error ? (
          <BadgeModelCanvas
            model={model}
            gltf={gltf}
            className="h-full w-full"
            viewStateKey={viewStateKey}
            motionStartCentered={motionStartCentered}
            interactive={interactive}
            allowInertia={allowInertia}
            onPoseChange={notifyPoseChange}
            onHasAnimationChange={notifyHasAnimationChange}
            onVisualReady={handleVisualReady}
          />
        ) : null}
      </div>
    </div>
  );
}

function usePaintedHost(ref: RefObject<HTMLElement | null>): boolean {
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const tick = () => {
      if (isPainted(node)) {
        setPainted(true);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => cancelAnimationFrame(frame);
  }, [ref]);

  return painted;
}

function isPainted(node: HTMLElement): boolean {
  if (typeof node.checkVisibility === "function") {
    try {
      return node.checkVisibility({
        opacityProperty: true,
        visibilityProperty: true,
      });
    } catch {
      return paintedByStyle(node);
    }
  }

  return paintedByStyle(node);
}

function paintedByStyle(node: HTMLElement): boolean {
  const rect = node.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;

  let current: HTMLElement | null = node;
  while (current) {
    const style = getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number.parseFloat(style.opacity) < 0.01) return false;
    current = current.parentElement;
  }
  return true;
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
