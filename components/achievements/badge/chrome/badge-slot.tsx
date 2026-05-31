import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared square frame for badge art across grid and detail (sizes only differ). */
export type BadgeSlotSize = "grid" | "detail";

const sizeClass: Record<BadgeSlotSize, string> = {
  grid:
    "relative flex aspect-square w-full max-w-[104px] shrink-0 items-center justify-center overflow-visible",
  detail:
    "relative mx-auto flex aspect-square w-[min(92vw,20rem)] max-w-full shrink-0 items-center justify-center overflow-visible sm:w-80",
};

type BadgeSlotProps = {
  size: BadgeSlotSize;
  className?: string;
  children: ReactNode;
};

export function BadgeSlot({
  size,
  className,
  children,
}: BadgeSlotProps) {
  return (
    <div className={cn(sizeClass[size], className)}>
      {children}
    </div>
  );
}
