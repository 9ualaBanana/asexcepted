"use client";

import type { BadgeUnlock } from "@/components/achievements/badge/display/badge-options";
import { isOpaqueBadgeHit } from "@/lib/achievements/badge/parallax/shape-utils";
import { cn } from "@/lib/utils";

type BadgeUnlockHoldLayerProps = {
  hold?: BadgeUnlock["hold"];
  locked: boolean;
};

/** Press-and-hold hit target over the badge while locked. */
export function BadgeUnlockHoldLayer({ hold, locked }: BadgeUnlockHoldLayerProps) {
  if (!hold?.enabled || !locked) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Press and hold to unlock"
      className={cn(
        "no-tap-highlight absolute inset-0 z-20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
      )}
      onPointerDown={(e) => {
        if (
          !isOpaqueBadgeHit(
            e.clientX,
            e.clientY,
            e.currentTarget.getBoundingClientRect(),
            hold.alphaMaskRef.current,
            "filled",
          )
        ) {
          return;
        }
        hold.onPointerDown?.();
      }}
      onPointerUp={hold.onPointerEnd}
      onPointerLeave={hold.onPointerEnd}
      onPointerCancel={hold.onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
