"use client";

import { BadgeFloatingLayer } from "@/components/achievements/badge/display/badge-floating-layer";
import {
  getBadgeContentMode,
  resolveLiveVisualMode,
  type BadgeContent,
} from "@/components/achievements/badge/display/badge-options";
import type { BadgeModelAsset } from "@/lib/achievements/badge/shared/badge-model-asset";
import { BadgePreviewLayer } from "@/components/achievements/badge/display/badge-preview-layer";
import { useBadgeModelPreviewOverlay } from "@/components/achievements/badge/display/gltf/hooks/use-badge-model-preview-overlay";
import {
  BadgeGltfViewer,
  useBadgeGltfSignedUrl,
} from "@/components/achievements/badge/display/gltf/badge-gltf-viewer";
import { BadgeParallaxViewer } from "@/components/achievements/badge/display/parallax/badge-parallax-viewer";
import { cn } from "@/lib/utils";

type BadgeInteractiveContentLayerProps = {
  displaySrc: string | null;
  model?: BadgeModelAsset | null;
  signedModelUrlProp?: string | null;
  motionSeed: string;
  float: boolean;
  content: BadgeContent;
  impressionEffect: boolean;
};

export function BadgeInteractiveContentLayer({
  displaySrc,
  model,
  signedModelUrlProp,
  motionSeed,
  float,
  content,
  impressionEffect,
}: BadgeInteractiveContentLayerProps) {
  const { isInteractive, isEditor, isLiveViewer, interactive, editor } =
    getBadgeContentMode(content);

  const signedModelUrl = useBadgeGltfSignedUrl(
    model,
    signedModelUrlProp,
    interactive?.onModelUrlReady ?? editor?.onModelUrlReady,
  );

  const visualMode = resolveLiveVisualMode({
    hasDisplaySrc: !!displaySrc,
    hasModel: !!model,
    hasSignedModelUrl: !!signedModelUrl,
    isInteractive,
    isLiveViewer,
  });

  const { ready, previewVisible, handleVisualReady, handleLoadError } =
    useBadgeModelPreviewOverlay({
      signedModelUrl: visualMode === "glb" ? (signedModelUrl ?? "") : "",
      showPreviewOverlay: editor?.showPreviewOverlay ?? true,
      onVisualReady: interactive?.onVisualReady,
    });

  if (!displaySrc) return null;

  const onImageDecoded = interactive?.onImageDecoded;

  const floatingLayerProps = {
    enabled: isInteractive,
    float,
    motionSeed,
    motionStartCentered: interactive?.motionStartCentered,
  };

  switch (visualMode) {
    case "glb":
      return (
        <BadgeFloatingLayer {...floatingLayerProps}>
          <div
            className={cn(
              "relative h-full w-full",
              editor?.busy && "transition-all duration-500 ease-out",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 z-10 transition-opacity duration-200",
                previewVisible ? "opacity-100" : "opacity-0",
              )}
            >
              <BadgePreviewLayer
                src={displaySrc}
                variant="poster"
                onDecoded={onImageDecoded}
              />
            </div>
            <BadgeGltfViewer
              model={model!}
              signedModelUrl={signedModelUrl!}
              motionSeed={motionSeed}
              motionStartCentered={interactive?.motionStartCentered}
              stateKey={interactive?.viewerStateKey}
              onVisualReadyFromCanvas={handleVisualReady}
              onLoadError={handleLoadError}
              onHasAnimationChange={editor?.onHasAnimationChange}
              onPoseChange={editor?.onPoseChange}
              allowInertia={!isEditor}
              interactive={editor?.allowModelRotation ?? true}
              ready={ready}
            />
          </div>
        </BadgeFloatingLayer>
      );
    case "parallax":
      return (
        <BadgeFloatingLayer {...floatingLayerProps}>
          <BadgeParallaxViewer
            src={displaySrc}
            className="p-1"
            impressionEffect={
              impressionEffect
                ? (interactive?.viewerStateKey ?? motionSeed)
                : null
            }
            onImageDecoded={onImageDecoded}
            onVisualReady={interactive?.onVisualReady}
          />
        </BadgeFloatingLayer>
      );
    default:
      return (
        <BadgePreviewLayer
          src={displaySrc}
          variant="flat"
          onDecoded={onImageDecoded}
          imageClassName={editor?.imageClassName}
          busy={editor?.busy}
        />
      );
  }
}
