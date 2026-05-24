import { Gift, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AchievementBadgeSlot } from "@/components/achievements/badge/achievement-badge-slot";
import {
  AchievementBadgeIconDisc,
  achievementBadgeIconDiscSizeStyles,
} from "@/components/achievements/badge/achievement-badge-icon-disc";
import { AchievementFallbackBadge } from "@/components/achievements/badge/achievement-fallback-badge";
import type { AchievementTone } from "@/components/achievements/achievement-card";
import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import { ImpressionGlitterField } from "@/components/achievements/badge/impression-glitter-field";
import { IMPRESSION_GLITTER_UI_ENABLED } from "@/lib/achievements/impression-glitter-feature";
import {
  badgeImageMaskStyle,
  circularBadgeMaskStyle,
} from "@/lib/achievements/badge-mask-style";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
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

const gridItemButtonClass =
  "no-tap-highlight flex w-full flex-col items-center gap-1.5 px-0.5 py-1 text-center outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const gridItemTitleClass =
  "line-clamp-2 w-full shrink-0 overflow-hidden text-[11px] font-medium leading-[1.35] h-[2.7em] max-h-[2.7em] sm:text-xs";

export function AchievementGridItemDedicate({ onClick }: { onClick: () => void }) {
  return (
    <AchievementGridItemContainer
      onClick={onClick}
      buttonClassName="group text-violet-200/55 hover:text-violet-100/90"
      badge={
        <AchievementBadgeSlot
          size="grid"
          className={cn(
            "rounded-3xl border border-dashed border-violet-300/30 bg-transparent transition-colors",
            "group-hover:border-violet-200/50 group-hover:bg-violet-500/[0.06]",
          )}
        >
          <div className="flex h-full w-full items-center justify-center">
            <AchievementBadgeIconDisc size="grid">
              <Gift
                className={cn(
                  "text-violet-200/80",
                  achievementBadgeIconDiscSizeStyles.grid.iconLocked,
                )}
                aria-hidden
              />
            </AchievementBadgeIconDisc>
          </div>
        </AchievementBadgeSlot>
      }
      title={
        <p
          className={cn(
            gridItemTitleClass,
            "text-violet-200/70 group-hover:text-violet-100/90",
          )}
        >
          Dedicate achievement
        </p>
      }
      dateLine={
        <p className="text-[10px] text-violet-200/40 sm:text-[11px]">Admin</p>
      }
    />
  );
}

export function AchievementGridItemAdd({ onClick }: { onClick: () => void }) {
  return (
    <AchievementGridItemContainer
      onClick={onClick}
      buttonClassName="group text-white/45 hover:text-white/80"
      badge={
        <AchievementBadgeSlot size="grid"
          className={cn(
            "rounded-3xl border border-dashed border-white/25 bg-transparent transition-colors",
            "group-hover:border-white/45 group-hover:bg-white/[0.04]",
          )}
        >
          <div className="flex h-full w-full items-center justify-center">
            <AchievementBadgeIconDisc size="grid">
              <Sparkles
                className={cn(
                  "text-foreground/70 dark:text-white/65",
                  achievementBadgeIconDiscSizeStyles.grid.iconLocked,
                )}
                aria-hidden
              />
            </AchievementBadgeIconDisc>
          </div>
        </AchievementBadgeSlot>
      }
      title={
        <p
          className={cn(
            gridItemTitleClass,
            "text-white/55 group-hover:text-white/80",
          )}
        >
          Add achievement
        </p>
      }
      dateLine={
        <p className="text-[10px] text-white/35 sm:text-[11px]">—</p>
      }
    />
  );
}

type AchievementGridItemProps = {
  id: string;
  title: string | null;
  dateLabel: string | null;
  iconUrl: string | null;
  FallbackIcon: LucideIcon;
  tone: AchievementTone;
  isLocked: boolean;
  hasImpressions: boolean;
  onClick: () => void;
};

export function AchievementGridItem({
  id,
  title,
  dateLabel,
  iconUrl,
  FallbackIcon,
  tone,
  isLocked,
  hasImpressions,
  onClick,
}: AchievementGridItemProps) {
  const displayTitle = title?.trim() || (isLocked ? "Locked" : "Untitled");
  const displaySrc = iconUrl?.trim() ? toOptimizedBadgeRenderSrc(iconUrl.trim()) : null;
  const silhouetteMaskStyle = displaySrc ? getAlphaMaskStyle(displaySrc) : null;
  const glitterMaskStyle = displaySrc
    ? badgeImageMaskStyle(displaySrc)
    : circularBadgeMaskStyle();

  return (
    <AchievementGridItemContainer
      onClick={onClick}
      buttonClassName={isLocked ? "opacity-70 grayscale" : undefined}
      badge={
        <AchievementBadgeSlot size="grid">
          <div className="relative h-full w-full">
            {IMPRESSION_GLITTER_UI_ENABLED && hasImpressions ? (
              <ImpressionGlitterField
                active
                motionSeed={id}
                maskStyle={glitterMaskStyle}
                variant="grid"
              />
            ) : null}
            {displaySrc ? (
              <>
                {!isLocked && silhouetteMaskStyle ? (
                  <div
                    aria-hidden
                    className="achievement-badge-silhouette-shadow"
                    style={silhouetteMaskStyle}
                  />
                ) : null}
                <div className="relative h-full w-full">
                  <RemoteBadgeImage src={displaySrc} />
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
      }
      title={
        <p className={cn(gridItemTitleClass, "text-white")}>{displayTitle}</p>
      }
      dateLine={
        dateLabel ? (
          <p className="text-[10px] text-white/45 sm:text-[11px]">{dateLabel}</p>
        ) : (
          <p className="text-[10px] text-white/35 sm:text-[11px]">—</p>
        )
      }
    />
  );
}

type AchievementGridItemContainerProps = {
  onClick: () => void;
  badge: ReactNode;
  title: ReactNode;
  dateLine: ReactNode;
  buttonClassName?: string;
};

function AchievementGridItemContainer({
  onClick,
  badge,
  title,
  dateLine,
  buttonClassName,
}: AchievementGridItemContainerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(gridItemButtonClass, buttonClassName)}
    >
      {badge}
      {title}
      {dateLine}
    </button>
  );
}

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
