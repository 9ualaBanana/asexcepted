"use client";

import { useCallback, useState, type ReactNode } from "react";

import { ImpressionBurst } from "@/components/achievements/badge/effects/impression-burst";
import type { BadgeImpression } from "@/components/achievements/badge/display/badge-options";
import { useDoubleActivate } from "@/lib/hooks/use-double-activate";
import { cn } from "@/lib/utils";

type BadgeImpressionLayerProps = {
  impression?: BadgeImpression;
  children: ReactNode;
};

/** Impression burst overlay and double-tap activation above the badge stack. */
export function BadgeImpressionLayer({
  impression,
  children,
}: BadgeImpressionLayerProps) {
  const [burstPulse, setBurstPulse] = useState(0);

  const handleActivate = useCallback(() => {
    setBurstPulse((n) => n + 1);
    impression?.onActivate?.();
  }, [impression]);

  const doubleActivate = useDoubleActivate({
    onActivate: handleActivate,
    disabled: !impression?.burstEnabled || impression.activateDisabled,
  });

  if (!impression?.burstEnabled) {
    return children;
  }

  return (
    <div
      className={cn(
        "relative",
        !impression.activateDisabled && "no-tap-highlight",
      )}
      onDoubleClick={doubleActivate.onDoubleClick}
      onPointerUp={doubleActivate.onPointerUp}
    >
      <ImpressionBurst pulse={burstPulse} />
      {children}
    </div>
  );
}
