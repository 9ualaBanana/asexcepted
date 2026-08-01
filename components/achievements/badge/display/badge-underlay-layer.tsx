"use client";

import type { AchievementTone } from "@/components/achievements/achievement-manager-utils";
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
import type { ReactNode } from "react";

type BadgeUnderlayLayerProps = {
  locked: boolean;
  thumbnailSrc: string | null;
  content: BadgeContent;
  allowFallback: boolean;
  icon: AchievementIconKey;
  tone: AchievementTone;
  frame: BadgeFrame;
  /** Unlocked live art (GLB / parallax / flat). Omitted while locked. */
  liveArt?: ReactNode;
};

/** Underlay: fallback, locked flat thumbnail, or live art when unlocked. */
export function BadgeUnderlayLayer({
  locked,
  thumbnailSrc,
  content,
  allowFallback,
  icon,
  tone,
  frame,
  liveArt,
}: BadgeUnderlayLayerProps) {
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
          "absolute inset-0",
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

  return (
    <div className="absolute inset-0">
      {liveArt ?? (
        <BadgePreviewLayer
          src={thumbnailSrc}
          variant="flat"
          onDecoded={interactive?.onImageDecoded}
        />
      )}
    </div>
  );
}
