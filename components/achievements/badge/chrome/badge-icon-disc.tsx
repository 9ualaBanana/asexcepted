import type { ReactNode } from "react";

import { type AchievementTone } from "@/components/achievements/achievement-card";
import { cn } from "@/lib/utils";

const toneInnerDiscStyles: Record<AchievementTone, string> = {
  rose: "border-rose-200/70 from-rose-200/75 via-rose-100/45 to-white/35 ring-rose-200/35",
  indigo:
    "border-indigo-200/70 from-indigo-200/75 via-indigo-100/45 to-white/35 ring-indigo-200/35",
  teal: "border-teal-200/70 from-teal-200/75 via-teal-100/45 to-white/35 ring-teal-200/35",
  orange:
    "border-orange-200/70 from-orange-200/75 via-orange-100/45 to-white/35 ring-orange-200/35",
  lime: "border-lime-200/70 from-lime-200/75 via-lime-100/45 to-white/35 ring-lime-200/35",
  fuchsia:
    "border-fuchsia-200/70 from-fuchsia-200/75 via-fuchsia-100/45 to-white/35 ring-fuchsia-200/35",
};

export type BadgeIconDiscSize = "grid" | "detail";

/** Inner frosted disc around lock / category icons (grid + detail). */
export const badgeIconDiscSizeStyles = {
  grid: {
    inner: "p-2.5",
    iconLocked: "h-7 w-7",
    iconUnlocked: "h-8 w-8",
  },
  detail: {
    inner: "p-8",
    iconLocked: "h-24 w-24",
    iconUnlocked: "h-28 w-28",
  },
} as const;

type BadgeIconDiscProps = {
  size?: BadgeIconDiscSize;
  tone?: AchievementTone;
  className?: string;
  children: ReactNode;
};

export function BadgeIconDisc({
  size = "grid",
  tone,
  className,
  children,
}: BadgeIconDiscProps) {
  const s = badgeIconDiscSizeStyles[size];
  const toneStyles = tone ? toneInnerDiscStyles[tone] : null;

  return (
    <div
      className={cn(
        "relative z-10 flex items-center justify-center rounded-full border shadow-sm ring-2 backdrop-blur-sm",
        toneStyles ??
          "border-white/60 bg-gradient-to-br from-white/75 to-white/25 ring-white/20 dark:from-white/20 dark:to-white/5",
        toneStyles && "bg-gradient-to-br",
        s.inner,
        className,
      )}
    >
      {children}
    </div>
  );
}
