"use client";

import { useEffect } from "react";

import { isStandalonePwa } from "@/lib/pwa/install-context";

/** Keep portrait orientation in installed PWA builds where the API exists. */
export function ScreenOrientationLock() {
  useEffect(() => {
    if (!isStandalonePwa()) return;
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
      unlock?: () => void;
    };
    if (!orientation.lock) return;
    void orientation.lock("portrait").catch(() => undefined);
    return () => {
      try {
        orientation.unlock?.();
      } catch {
        // ignore
      }
    };
  }, []);

  return null;
}
