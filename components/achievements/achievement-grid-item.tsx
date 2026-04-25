import type { LucideIcon } from "lucide-react";

import { AchievementBadgeSlot } from "@/components/achievements/achievement-badge-slot";
import { AchievementFallbackBadge } from "@/components/achievements/achievement-fallback-badge";
import type { AchievementTone } from "@/components/achievements/achievement-card";
import { RemoteBadgeImage } from "@/components/achievements/achievement-remote-badge-image";
import { cn } from "@/lib/utils";

type AchievementGridItemProps = {
  title: string | null;
  dateLabel: string | null;
  iconUrl: string | null;
  FallbackIcon: LucideIcon;
  /** Matches legacy achievement cards; drives gradient + border on the icon disc. */
  tone?: AchievementTone;
  isLocked: boolean;
  onClick: () => void;
};

export function AchievementGridItem({
  title,
  dateLabel,
  iconUrl,
  FallbackIcon,
  tone = "teal",
  isLocked,
  onClick,
}: AchievementGridItemProps) {
  const displayTitle = title?.trim() || (isLocked ? "Locked" : "Untitled");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-center gap-1.5 px-0.5 py-1 text-center outline-none transition-opacity",
        "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        isLocked && "opacity-70 grayscale",
      )}
    >
      <AchievementBadgeSlot size="grid">
        {iconUrl?.trim() ? (
          <RemoteBadgeImage src={iconUrl.trim()} />
        ) : (
          <AchievementFallbackBadge
            tone={tone}
            isLocked={isLocked}
            FallbackIcon={FallbackIcon}
            size="grid"
          />
        )}
      </AchievementBadgeSlot>
      <p
        className={cn(
          "line-clamp-2 w-full shrink-0 overflow-hidden text-[11px] font-medium leading-[1.35] text-white sm:text-xs",
          "h-[2.7em] max-h-[2.7em]",
        )}
      >
        {displayTitle}
      </p>
      {dateLabel ? (
        <p className="text-[10px] text-white/45 sm:text-[11px]">{dateLabel}</p>
      ) : (
        <p className="text-[10px] text-white/35">—</p>
      )}
    </button>
  );
}
