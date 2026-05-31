"use client";

import { BadgeModelViewer } from "@/components/achievements/badge/model/badge-model-viewer";
import { RemoteBadgeImage } from "@/components/achievements/badge/display/remote-badge-image";
import { useSignedBadgeModelUrl } from "@/components/achievements/badge/hooks/use-signed-badge-model-url";

export type BadgeModelLiveViewProps = {
  iconAssetPath: string;
  renderSrc: string;
  hasIconUrl: boolean;
  enabled: boolean;
  className?: string;
  float?: boolean;
  motionSeed: string;
  motionStartCentered?: boolean;
  initialYaw?: number;
  initialPitch?: number;
  playAnimation?: boolean;
  animationSpeed?: number;
  viewerStateKey?: string;
  onPreviewDecoded?: () => void;
  onModelUrlReady?: () => void;
  onVisualReady?: () => void;
};

/**
 * Live glTF badge: signed GLB URL + R3F viewer, with poster fallback while loading.
 */
export function BadgeModelLiveView({
  iconAssetPath,
  renderSrc,
  hasIconUrl,
  enabled,
  className = "p-1",
  float = true,
  motionSeed,
  motionStartCentered = false,
  initialYaw = 0,
  initialPitch = 0,
  playAnimation = true,
  animationSpeed = 1,
  viewerStateKey,
  onPreviewDecoded,
  onModelUrlReady,
  onVisualReady,
}: BadgeModelLiveViewProps) {
  const { signedUrl: signedModelUrl } = useSignedBadgeModelUrl(
    iconAssetPath,
    hasIconUrl && enabled,
    onModelUrlReady,
  );

  if (!enabled) {
    return null;
  }

  if (signedModelUrl) {
    return (
      <BadgeModelViewer
        signedModelUrl={signedModelUrl}
        previewSrc={renderSrc}
        className={className}
        float={float}
        motionSeed={motionSeed}
        motionStartCentered={motionStartCentered}
        initialYaw={initialYaw}
        initialPitch={initialPitch}
        playAnimation={playAnimation}
        animationSpeed={animationSpeed}
        stateKey={viewerStateKey}
        onPreviewDecoded={onPreviewDecoded}
        onVisualReady={onVisualReady}
      />
    );
  }

  if (!renderSrc) {
    return null;
  }

  return (
    <RemoteBadgeImage
      src={renderSrc}
      className="h-full w-full object-contain p-1"
      onDecoded={onPreviewDecoded}
    />
  );
}
