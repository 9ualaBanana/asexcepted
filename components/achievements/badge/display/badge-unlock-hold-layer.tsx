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
        capturePointerForHold(e.currentTarget, e.pointerId);
        hold.onPointerDown?.();
      }}
      onPointerUp={hold.onPointerEnd}
      onPointerCancel={hold.onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

// When the reveal overlay mounts (GLB/parallax under the finger),
// the browser often fires pointerleave even though the user is still holding.
// That called cancelUnlockHold → holdPressedRef = false → reveal aborted mid-fill.
function capturePointerForHold(target: HTMLElement, pointerId: number) {
  target.setPointerCapture(pointerId);
}
