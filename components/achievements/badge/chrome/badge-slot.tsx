import type { ReactNode } from "react";

import type { BadgeFrame } from "@/components/achievements/badge/display/badge-options";
import { cn } from "@/lib/utils";

/** Shared square frame for badge art across grid and detail (sizes only differ). */
export type BadgeSlotSize = "grid" | "detail";

const sizeClass: Record<BadgeSlotSize, string> = {
  grid:
    "relative flex aspect-square w-full max-w-[104px] shrink-0 items-center justify-center overflow-visible",
  detail:
    "relative mx-auto flex aspect-square w-[min(92vw,20rem)] max-w-full shrink-0 items-center justify-center overflow-visible sm:w-80",
};

type BadgeSlotBySizeProps = {
  size: BadgeSlotSize;
  className?: string;
  children: ReactNode;
};

type BadgeSlotByFrameProps = {
  frame: BadgeFrame;
  children: ReactNode;
};

export type BadgeSlotProps = BadgeSlotBySizeProps | BadgeSlotByFrameProps;

export function BadgeSlot(props: BadgeSlotProps) {
  if ("frame" in props) {
    const { frame, children } = props;
    if (frame.kind === "slot") {
      return (
        <BadgeSlot size={frame.size} className={frame.className}>
          {children}
        </BadgeSlot>
      );
    }

    return (
      <div
        className={cn(
          "relative h-full w-full min-h-0 min-w-0",
          frame.className,
        )}
      >
        {children}
      </div>
    );
  }

  const { size, className, children } = props;
  return (
    <div className={cn(sizeClass[size], className)}>{children}</div>
  );
}
