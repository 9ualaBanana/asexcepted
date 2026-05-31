"use client";

import { AchievementBadgeParallaxViewer } from "@/components/achievements/badge/parallax/achievement-badge-parallax-viewer";

export type BadgeImageParallaxViewProps = {
  renderSrc: string;
  className?: string;
  float?: boolean;
  motionSeed: string;
  motionStartCentered?: boolean;
  onImageDecoded?: () => void;
  onVisualReady?: () => void;
  impressionGlitter?: boolean;
  impressionGlitterRevealPulse?: number;
};

/**
 * Flat image badge with CSS parallax “3D” drag + optional impression glitter.
 */
export function BadgeImageParallaxView({
  renderSrc,
  className = "p-1",
  float = true,
  motionSeed,
  motionStartCentered = false,
  onImageDecoded,
  onVisualReady,
  impressionGlitter = false,
  impressionGlitterRevealPulse = 0,
}: BadgeImageParallaxViewProps) {
  return (
    <AchievementBadgeParallaxViewer
      src={renderSrc}
      className={className}
      float={float}
      motionSeed={motionSeed}
      motionStartCentered={motionStartCentered}
      onImageDecoded={onImageDecoded}
      onVisualReady={onVisualReady}
      impressionGlitter={impressionGlitter}
      impressionGlitterRevealPulse={impressionGlitterRevealPulse}
    />
  );
}
