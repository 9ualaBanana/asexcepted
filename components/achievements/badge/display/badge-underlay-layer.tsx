"use client";

import type { AchievementTone } from "@/components/achievements/achievement-manager-utils";
import { useBadgeLiveContent } from "@/components/achievements/badge/display/badge-live-content";
import type { AchievementIconKey } from "@/components/achievements/achievement-editor-shared";
import { BadgePreviewLayer } from "@/components/achievements/badge/display/badge-preview-layer";
import { FallbackBadge } from "@/components/achievements/badge/display/fallback-badge";
import {
  getBadgeContentMode,
  slotSizeFromFrame,
  type BadgeContent,
  type BadgeFrame,
} from "@/components/achievements/badge/display/badge-options";
import { cn } from "@/lib/utils";

type BadgeUnderlayLayerProps = {
  locked: boolean;
  thumbnailSrc: string | null;
  content: BadgeContent;
  allowFallback: boolean;
  icon: AchievementIconKey;
  tone: AchievementTone;
  frame: BadgeFrame;
};

/** Underlay: fallback, locked flat thumbnail, or interactive content when unlocked. */
export function BadgeUnderlayLayer({
  locked,
  thumbnailSrc,
  content,
  allowFallback,
  icon,
  tone,
  frame,
}: BadgeUnderlayLayerProps) {
  const liveContent = useBadgeLiveContent();
  const { interactive } = getBadgeContentMode(content);
  const slotSize = slotSizeFromFrame(frame);

  const fallback =
    allowFallback ? (
      <FallbackBadge
        tone={tone}
        isLocked={locked}
        icon={icon}
        size={slotSize}
      />
    ) : null;

  if (!thumbnailSrc) {
    return fallback;
  }

  if (locked) {
    return (
      <div
        className={cn(
          "relative h-full w-full",
          "opacity-70 grayscale",
        )}
      >
        <BadgePreviewLayer
          src={thumbnailSrc}
          variant="locked"
          onDecoded={interactive?.onImageDecoded}
        />
      </div>
    );
  }

  return <div className="relative h-full w-full">{liveContent}</div>;
}
