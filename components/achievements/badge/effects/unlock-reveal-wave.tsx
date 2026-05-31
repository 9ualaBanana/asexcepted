"use client";

import type { CSSProperties, ReactNode } from "react";

type UnlockRevealWaveProps = {
  isUnlocking: boolean;
  detailMaskStyle: CSSProperties | null;
  unlockRevealClipPath: string;
  children: ReactNode;
};

/** Shared clipped overlay used while the unlock wave is revealing the badge. */
export function UnlockRevealWave({
  isUnlocking,
  detailMaskStyle,
  unlockRevealClipPath,
  children,
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
      {children}
    </div>
  );
}
