"use client";

import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { useDrag } from "@use-gesture/react";

import type { BadgeGesture } from "@/components/achievements/badge/display/badge-options";
import { isOpaqueBadgeHit } from "@/lib/achievements/badge/parallax/shape-utils";
import { cn } from "@/lib/utils";

type BadgeGestureLayerProps = {
  gesture?: BadgeGesture | null;
  children: ReactNode;
};

export function BadgeGestureLayer({
  gesture,
  children,
}: BadgeGestureLayerProps) {
  if (gesture?.kind === "poke-tap") {
    return <BadgePokeGestureSurface onTap={gesture.onTap}>{children}</BadgePokeGestureSurface>;
  }

  return (
    <div className="relative h-full w-full">
      {gesture?.kind === "unlock-hold" ? (
        <BadgeUnlockHoldHitSurface gesture={gesture} />
      ) : null}
      {gesture?.kind === "refuse-tap" ? (
        <BadgeRefuseHitSurface gesture={gesture} />
      ) : null}
      {children}
    </div>
  );
}

function BadgePokeGestureSurface({
  onTap,
  children,
}: {
  onTap: () => void;
  children: ReactNode;
}) {
  const bind = useDrag(
    ({ tap }) => {
      if (tap) onTap();
    },
    {
      filterTaps: true,
      threshold: 6,
      pointer: { capture: false },
      preventScroll: false,
    },
  );

  return (
    <div className="relative h-full w-full touch-none" {...bind()}>
      {children}
    </div>
  );
}

function BadgeUnlockHoldHitSurface({
  gesture,
}: {
  gesture: Extract<BadgeGesture, { kind: "unlock-hold" }>;
}) {
  return (
    <button
      type="button"
      aria-label="Press and hold to unlock"
      className={hitSurfaceClassName}
      onPointerDown={(e) => {
        if (!isOpaquePointerHit(e, gesture.alphaMaskRef.current)) return;
        capturePointerForHold(e.currentTarget, e.pointerId);
        gesture.onPointerDown?.();
      }}
      onPointerUp={() => gesture.onPointerEnd?.()}
      onPointerCancel={() => gesture.onPointerEnd?.()}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

function BadgeRefuseHitSurface({
  gesture,
}: {
  gesture: Extract<BadgeGesture, { kind: "refuse-tap" }>;
}) {
  return (
    <button
      type="button"
      aria-label="Locked achievement"
      className={hitSurfaceClassName}
      onPointerDown={(e) => {
        if (!isOpaquePointerHit(e, gesture.alphaMaskRef.current)) return;
        e.preventDefault();
        gesture.onTap();
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

const hitSurfaceClassName = cn(
  "no-tap-highlight absolute inset-0 z-20 touch-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
);

function isOpaquePointerHit(
  e: ReactPointerEvent<HTMLElement>,
  mask: Parameters<typeof isOpaqueBadgeHit>[3],
) {
  return isOpaqueBadgeHit(
    e.clientX,
    e.clientY,
    e.currentTarget.getBoundingClientRect(),
    mask,
    "filled",
  );
}

function capturePointerForHold(target: HTMLElement, pointerId: number) {
  try {
    target.setPointerCapture(pointerId);
  } catch {
    /* capture may fail if already released */
  }
}
