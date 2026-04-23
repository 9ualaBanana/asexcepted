import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared square frame for badge art across grid, close-up, and edit (sizes only differ). */
export type AchievementBadgeSlotSize = "grid" | "editor" | "overlay-xl";

const sizeClass: Record<AchievementBadgeSlotSize, string> = {
  grid:
    "relative flex aspect-square w-full max-w-[104px] shrink-0 items-center justify-center overflow-visible",
  editor:
    "relative flex aspect-square h-40 w-40 max-w-40 shrink-0 items-center justify-center overflow-visible",
  "overlay-xl":
    "relative mx-auto flex aspect-square w-[min(92vw,20rem)] max-w-full shrink-0 items-center justify-center overflow-visible sm:w-80",
};

type AchievementBadgeSlotProps = {
  size: AchievementBadgeSlotSize;
  className?: string;
  children: ReactNode;
};

export function AchievementBadgeSlot({
  size,
  className,
  children,
}: AchievementBadgeSlotProps) {
  return (
    <div className={cn(sizeClass[size], className)}>
      {children}
    </div>
  );
}
