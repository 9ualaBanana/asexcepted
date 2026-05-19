import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AchievementBadgeIconDiscSize = "grid" | "detail";

/** Inner frosted disc around lock / category icons (grid + detail). */
export const achievementBadgeIconDiscSizeStyles = {
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

type AchievementBadgeIconDiscProps = {
  size?: AchievementBadgeIconDiscSize;
  className?: string;
  children: ReactNode;
};

export function AchievementBadgeIconDisc({
  size = "grid",
  className,
  children,
}: AchievementBadgeIconDiscProps) {
  const s = achievementBadgeIconDiscSizeStyles[size];

  return (
    <div
      className={cn(
        "relative z-10 flex items-center justify-center rounded-full border border-white/60",
        "bg-gradient-to-br from-white/75 to-white/25 shadow-sm ring-2 ring-white/20 backdrop-blur-sm",
        "dark:from-white/20 dark:to-white/5",
        s.inner,
        className,
      )}
    >
      {children}
    </div>
  );
}
