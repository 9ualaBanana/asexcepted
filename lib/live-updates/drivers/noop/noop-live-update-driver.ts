import type { LiveUpdateDriver } from "@/lib/live-updates/core/types";

/** Disabled / tests: domain hooks skip subscribing when this driver is selected. */
export const noopLiveUpdateDriver: LiveUpdateDriver = {
  driverId: "noop",
};
