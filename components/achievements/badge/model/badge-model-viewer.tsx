"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RemoteBadgeImage } from "@/components/achievements/badge/display/remote-badge-image";
import { BadgeModelCanvas } from "@/components/achievements/badge/model/r3f/badge-model-canvas";
import { getCachedBadgeMotionStyle } from "@/lib/badge/render-cache";
import { cn } from "@/lib/utils";

export type BadgeModelViewerProps = {
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

export function BadgeModelViewer({
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
}: BadgeModelViewerProps) {
  const onVisualReadyRef = useRef(onVisualReady);
  onVisualReadyRef.current = onVisualReady;
  const onPreviewDecodedRef = useRef(onPreviewDecoded);
  onPreviewDecodedRef.current = onPreviewDecoded;
  const onHasAnimationChangeRef = useRef(onHasAnimationChange);
  onHasAnimationChangeRef.current = onHasAnimationChange;
  const onPoseChangeRef = useRef(onPoseChange);
  onPoseChangeRef.current = onPoseChange;

  const [ready, setReady] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(true);

  /** Stable per asset — pose lives in view-state cache, not in this key. */
  const viewStateKey = useMemo(() => {
    return (stateKey ?? motionSeed ?? signedModelUrl).trim() || signedModelUrl;
  }, [motionSeed, signedModelUrl, stateKey]);

  useEffect(() => {
    setReady(false);
    setPreviewVisible(true);
  }, [signedModelUrl]);

  const handleVisualReady = useCallback(() => {
    setReady(true);
    onVisualReadyRef.current?.();
    if (showPreviewOverlay) {
      window.setTimeout(() => {
        setPreviewVisible(false);
      }, 90);
    } else {
      setPreviewVisible(false);
    }
  }, [showPreviewOverlay]);

  const handleLoadError = useCallback(() => {
    setReady(false);
    setPreviewVisible(true);
    onHasAnimationChangeRef.current?.(false);
  }, []);

  const floatMotionStyle = useMemo(
    () =>
      float
        ? getCachedBadgeMotionStyle(
            (motionSeed ?? signedModelUrl).trim() || "badge-model",
            motionStartCentered,
          )
        : undefined,
    [float, motionSeed, motionStartCentered, signedModelUrl],
  );

  const viewer = (
    <div className={cn("relative h-full w-full", className)}>
      <div className="relative h-full w-full p-1">
        {previewSrc.trim() ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-10 transition-opacity duration-200",
              previewVisible ? "opacity-100" : "opacity-0",
            )}
          >
            <RemoteBadgeImage
              src={previewSrc}
              className="h-full w-full object-contain"
              onDecoded={() => onPreviewDecodedRef.current?.()}
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
            onPoseChange={(yaw, pitch) => onPoseChangeRef.current?.(yaw, pitch)}
            onHasAnimationChange={(has) => onHasAnimationChangeRef.current?.(has)}
            onVisualReady={handleVisualReady}
            onLoadError={handleLoadError}
          />
        </div>
      </div>
    </div>
  );

  if (!float) return viewer;

  return (
    <div className="relative h-full w-full">
      <div
        className="relative h-full w-full badge-object-float"
        style={floatMotionStyle}
      >
        {viewer}
      </div>
    </div>
  );
}
