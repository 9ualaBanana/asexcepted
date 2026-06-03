import { Gift, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/achievements/badge/display/badge";
import { badgeOptionsForGrid } from "@/components/achievements/badge/display/badge-presets";
import {
  BadgeSlot,
  BadgeIconDisc,
  badgeIconDiscSizeStyles,
} from "@/components/achievements/badge";
import type { AchievementTone } from "@/components/achievements/achievement-manager-utils";
import type { AchievementIconKey } from "@/components/achievements/achievement-editor-shared";
import { cn } from "@/lib/utils";

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
        <BadgeSlot
          size="grid"
          className={cn(
            "rounded-3xl border border-dashed border-violet-300/30 bg-transparent transition-colors",
            "group-hover:border-violet-200/50 group-hover:bg-violet-500/[0.06]",
          )}
        >
          <div className="flex h-full w-full items-center justify-center">
            <BadgeIconDisc size="grid">
              <Gift
                className={cn(
                  "text-violet-200/80",
                  badgeIconDiscSizeStyles.grid.iconLocked,
                )}
                aria-hidden
              />
            </BadgeIconDisc>
          </div>
        </BadgeSlot>
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
        <BadgeSlot size="grid"
          className={cn(
            "rounded-3xl border border-dashed border-white/25 bg-transparent transition-colors",
            "group-hover:border-white/45 group-hover:bg-white/[0.04]",
          )}
        >
          <div className="flex h-full w-full items-center justify-center">
            <BadgeIconDisc size="grid">
              <Sparkles
                className={cn(
                  "text-foreground/70 dark:text-white/65",
                  badgeIconDiscSizeStyles.grid.iconLocked,
                )}
                aria-hidden
              />
            </BadgeIconDisc>
          </div>
        </BadgeSlot>
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
  displaySrc: string | null;
  icon: AchievementIconKey;
  tone: AchievementTone;
  isLocked: boolean;
  showDedicatedGlitter: boolean;
  onClick: () => void;
};

export function AchievementGridItem({
  id,
  title,
  dateLabel,
  displaySrc,
  icon,
  tone,
  isLocked,
  showDedicatedGlitter,
  onClick,
}: AchievementGridItemProps) {
  const displayTitle = title?.trim() || (isLocked ? "Locked" : "Untitled");

  const badgeOptions = badgeOptionsForGrid({
    id,
    displaySrc,
    icon,
    tone,
    isLocked,
    showDedicatedGlitter,
  });

  return (
    <AchievementGridItemContainer
      onClick={onClick}
      badge={<Badge options={badgeOptions} />}
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
  buttonClassName?: string;
  badge: ReactNode;
  title: ReactNode;
  dateLine: ReactNode;
};

function AchievementGridItemContainer({
  onClick,
  buttonClassName,
  badge,
  title,
  dateLine,
}: AchievementGridItemContainerProps) {
  return (
    <button type="button" onClick={onClick} className={cn(gridItemButtonClass, buttonClassName)}>
      {badge}
      {title}
      {dateLine}
    </button>
  );
}

export function AchievementGridItemFallback() {
  return (
    <div className={gridItemButtonClass} aria-hidden>
      <div className="aspect-square w-full max-w-[104px] shrink-0 animate-pulse rounded-3xl bg-white/10" />
      <div className="h-[2.7em] w-full animate-pulse rounded bg-white/10" />
      <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
    </div>
  );
}
