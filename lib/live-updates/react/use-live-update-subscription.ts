"use client";

import { useEffect, useRef } from "react";

import type { LiveUpdateSource } from "@/lib/live-updates/core/types";
import { useLiveUpdateDriver } from "@/lib/live-updates/react/live-update-provider";
import { noopLiveUpdateDriver } from "@/lib/live-updates/drivers/noop/noop-live-update-driver";

type UseLiveUpdateSubscriptionOptions = {
  enabled?: boolean;
  /** Build a source when enabled; return null to skip. */
  createSource: () => LiveUpdateSource | null;
  /** Refresh local state (re-fetch, merge rows, etc.). */
  onInvalidate: () => void;
};

/**
 * Subscribe to a {@link LiveUpdateSource} while mounted.
 * Skips when disabled or driver is `noop`.
 */
export function useLiveUpdateSubscription({
  enabled = true,
  createSource,
  onInvalidate,
}: UseLiveUpdateSubscriptionOptions) {
  const driver = useLiveUpdateDriver();
  const onInvalidateRef = useRef(onInvalidate);
  onInvalidateRef.current = onInvalidate;

  useEffect(() => {
    if (!enabled || driver.driverId === noopLiveUpdateDriver.driverId) {
      return;
    }

    const source = createSource();
    if (!source) return;

    const dispose = source.start(() => {
      onInvalidateRef.current();
    });

    return dispose;
  }, [createSource, driver.driverId, enabled]);
}
