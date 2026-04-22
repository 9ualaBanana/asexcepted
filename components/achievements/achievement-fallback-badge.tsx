import { LockSimple, type Icon as PhosphorIcon } from "@phosphor-icons/react";

import {
  achievementToneStyles,
  type AchievementTone,
} from "@/components/achievements/achievement-card";
import { cn } from "@/lib/utils";

type AchievementFallbackBadgeProps = {
  tone: AchievementTone;
  isLocked: boolean;
  FallbackIcon: PhosphorIcon;
  /** Compact grid cell vs. larger detail overlay */
  size?: "grid" | "overlay";
  className?: string;
};

const sizeStyles = {
  grid: {
    orb: "-right-5 -top-5 h-[4.5rem] w-[4.5rem]",
    inner: "p-2.5",
    iconUnlocked: "h-8 w-8",
    iconLocked: "h-7 w-7",
  },
  overlay: {
    orb: "-right-8 -top-8 h-28 w-28",
    inner: "p-4",
    iconUnlocked: "h-14 w-14",
    iconLocked: "h-12 w-12",
  },
} as const;

/**
 * Phosphor / lock badge disc: same tone gradient, glow, and frosted inner pill
 * as legacy achievement cards (grid + detail overlay).
 */
export function AchievementFallbackBadge({
  tone,
  isLocked,
  FallbackIcon,
  size = "grid",
  className,
}: AchievementFallbackBadgeProps) {
  const s = sizeStyles[size];

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border",
        isLocked
          ? "border-dashed border-muted-foreground/40 bg-transparent shadow-none"
          : cn(
              "border-solid bg-card/90 shadow-sm",
              "bg-gradient-to-br",
              achievementToneStyles[tone],
            ),
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute rounded-full blur-2xl",
          s.orb,
          isLocked ? "bg-white/10" : "bg-white/20",
        )}
      />
      <div
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full border border-white/60",
          "bg-gradient-to-br from-white/75 to-white/25 shadow-sm ring-2 ring-white/20 backdrop-blur-sm",
          "dark:from-white/20 dark:to-white/5",
          s.inner,
        )}
      >
        {isLocked ? (
          <LockSimple
            className={cn(
              "text-foreground/70 dark:text-white/65",
              s.iconLocked,
            )}
            weight="fill"
          />
        ) : (
          <FallbackIcon
            className={cn(
              "text-foreground/90 dark:text-white/90",
              s.iconUnlocked,
            )}
            weight="fill"
          />
        )}
      </div>
    </div>
  );
}
