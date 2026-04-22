import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

import { AchievementFallbackBadge } from "@/components/achievements/achievement-fallback-badge";
import type { AchievementTone } from "@/components/achievements/achievement-card";
import { cn } from "@/lib/utils";

type AchievementGridItemProps = {
  title: string | null;
  dateLabel: string | null;
  iconUrl: string | null;
  FallbackIcon: PhosphorIcon;
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
  tone = "gold",
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
      <div className="relative flex aspect-square w-full max-w-[104px] items-center justify-center">
        {iconUrl?.trim() ? (
          // user-supplied ImageKit URLs — plain img avoids Next remotePatterns
          <img
            src={iconUrl.trim()}
            alt=""
            className="h-full w-full object-contain drop-shadow-md"
          />
        ) : (
          <AchievementFallbackBadge
            tone={tone}
            isLocked={isLocked}
            FallbackIcon={FallbackIcon}
            size="grid"
          />
        )}
      </div>
      <p className="line-clamp-2 w-full text-[11px] font-medium leading-tight text-white sm:text-xs">
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
