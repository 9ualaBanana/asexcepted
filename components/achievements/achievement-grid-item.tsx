import type { LucideIcon } from "lucide-react";

import { AchievementBadgeSlot } from "@/components/achievements/badge/achievement-badge-slot";
import { AchievementFallbackBadge } from "@/components/achievements/badge/achievement-fallback-badge";
import type { AchievementTone } from "@/components/achievements/achievement-card";
import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import { cn } from "@/lib/utils";

function getAlphaMaskStyle(src: string) {
  const safeSrc = src.replace(/"/g, '\\"');
  const maskUrl = `url("${safeSrc}")`;
  return {
    WebkitMaskImage: maskUrl,
    maskImage: maskUrl,
    WebkitMaskRepeat: "no-repeat" as const,
    maskRepeat: "no-repeat" as const,
    WebkitMaskPosition: "center" as const,
    maskPosition: "center" as const,
    WebkitMaskSize: "contain" as const,
    maskSize: "contain" as const,
  };
}

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

export function AchievementGridItemFallback() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col items-center gap-1.5 px-0.5 py-1"
    >
      <div
        className={cn(
          "aspect-square w-full max-w-[104px] animate-pulse rounded-3xl",
          "bg-gradient-to-br from-white/[0.1] to-white/[0.03]",
          "ring-1 ring-inset ring-white/10",
        )}
      />
      <div className="flex h-[2.7em] w-full max-w-[104px] flex-col justify-center gap-1.5 px-1">
        <div className="mx-auto h-2 w-[88%] max-w-[5.5rem] animate-pulse rounded-full bg-white/[0.08]" />
        <div className="mx-auto h-2 w-[62%] max-w-[4rem] animate-pulse rounded-full bg-white/[0.06]" />
      </div>
      <div className="h-2.5 w-11 animate-pulse rounded-full bg-white/[0.06]" />
    </div>
  );
}

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
  const cleanIconUrl = iconUrl?.trim() ?? "";
  const silhouetteMaskStyle = cleanIconUrl ? getAlphaMaskStyle(cleanIconUrl) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "no-tap-highlight flex w-full flex-col items-center gap-1.5 px-0.5 py-1 text-center outline-none transition-opacity",
        "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isLocked && "opacity-70 grayscale",
      )}
    >
      <AchievementBadgeSlot size="grid">
        <div
          className={cn(
            "relative h-full w-full",
          )}
        >
          {cleanIconUrl ? (
            <>
              {!isLocked && silhouetteMaskStyle ? (
                <div
                  aria-hidden
                  className="achievement-badge-silhouette-shadow"
                  style={silhouetteMaskStyle}
                />
              ) : null}
              <div
                className={cn(
                  "relative h-full w-full",
                )}
              >
                <RemoteBadgeImage src={cleanIconUrl} />
              </div>
            </>
          ) : (
            <AchievementFallbackBadge
              tone={tone}
              isLocked={isLocked}
              FallbackIcon={FallbackIcon}
              size="grid"
            />
          )}
        </div>
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
