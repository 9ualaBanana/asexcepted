import type { LiveUpdateDriver } from "@/lib/live-updates/core/types";
import { noopLiveUpdateDriver } from "@/lib/live-updates/drivers/noop/noop-live-update-driver";
import { supabaseLiveUpdateDriver } from "@/lib/live-updates/drivers/supabase/supabase-live-update-driver";

/**
 * Select live-update transport. Set NEXT_PUBLIC_LIVE_UPDATES_DRIVER=noop to disable.
 */
export function getDefaultLiveUpdateDriver(): LiveUpdateDriver {
  const id = process.env.NEXT_PUBLIC_LIVE_UPDATES_DRIVER?.trim();
  if (id === "noop") {
    return noopLiveUpdateDriver;
  }
  return supabaseLiveUpdateDriver;
}
