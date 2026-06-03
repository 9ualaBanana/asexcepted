"use client";

import type { CSSProperties, ReactNode } from "react";

type UnlockRevealWaveProps = {
  isUnlocking: boolean;
  detailMaskStyle: CSSProperties | null;
  unlockRevealClipPath: string;
  reveal: ReactNode;
};

/** Clipped overlay for the unlocked badge during the unlock animation. */
export function UnlockRevealWave({
  isUnlocking,
  detailMaskStyle,
  unlockRevealClipPath,
  reveal,
}: UnlockRevealWaveProps) {
  if (!isUnlocking) return null;
  return (
    <div
      className="absolute inset-0 z-[18] pointer-events-none"
      style={{
        ...(detailMaskStyle ?? {}),
        clipPath: unlockRevealClipPath,
      }}
    >
      {reveal}
    </div>
  );
}
