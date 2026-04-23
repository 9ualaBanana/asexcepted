import { Lock, type LucideIcon } from "lucide-react";

import {
  type AchievementTone,
} from "@/components/achievements/achievement-card";
import { cn } from "@/lib/utils";

type AchievementFallbackBadgeProps = {
  tone: AchievementTone;
  isLocked: boolean;
  FallbackIcon: LucideIcon;
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

const toneGlowStyles: Record<AchievementTone, string> = {
  gold: "bg-amber-300/35",
  violet: "bg-violet-300/35",
  emerald: "bg-emerald-300/35",
  sky: "bg-sky-300/35",
  rose: "bg-rose-300/35",
  indigo: "bg-indigo-300/35",
  teal: "bg-teal-300/35",
  orange: "bg-orange-300/35",
  lime: "bg-lime-300/35",
  cyan: "bg-cyan-300/35",
  fuchsia: "bg-fuchsia-300/35",
};

const toneDiscStyles: Record<AchievementTone, string> = {
  gold:
    "from-amber-300/35 via-amber-200/18 to-black/25 border-amber-300/45",
  violet:
    "from-violet-300/35 via-fuchsia-200/18 to-black/25 border-violet-300/45",
  emerald:
    "from-emerald-300/35 via-lime-200/18 to-black/25 border-emerald-300/45",
  sky: "from-sky-300/35 via-cyan-200/18 to-black/25 border-sky-300/45",
  rose: "from-rose-300/35 via-pink-200/18 to-black/25 border-rose-300/45",
  indigo:
    "from-indigo-300/35 via-blue-200/18 to-black/25 border-indigo-300/45",
  teal: "from-teal-300/35 via-cyan-200/18 to-black/25 border-teal-300/45",
  orange:
    "from-orange-300/35 via-amber-200/18 to-black/25 border-orange-300/45",
  lime: "from-lime-300/35 via-emerald-200/18 to-black/25 border-lime-300/45",
  cyan: "from-cyan-300/35 via-sky-200/18 to-black/25 border-cyan-300/45",
  fuchsia:
    "from-fuchsia-300/35 via-pink-200/18 to-black/25 border-fuchsia-300/45",
};

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
              "border-solid bg-card/90 bg-gradient-to-br shadow-sm",
              toneDiscStyles[tone],
            ),
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute rounded-full blur-2xl",
          s.orb,
          isLocked ? "bg-white/10" : toneGlowStyles[tone],
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
          <Lock
            className={cn(
              "text-foreground/70 dark:text-white/65",
              s.iconLocked,
            )}
            aria-hidden
          />
        ) : (
          <FallbackIcon
            className={cn(
              "text-foreground/90 dark:text-white/90",
              s.iconUnlocked,
            )}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
