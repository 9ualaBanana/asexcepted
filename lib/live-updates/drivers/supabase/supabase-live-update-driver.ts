import type { LiveUpdateDriver } from "@/lib/live-updates/core/types";

/** Default transport: Supabase Realtime (postgres_changes). */
export const supabaseLiveUpdateDriver: LiveUpdateDriver = {
  driverId: "supabase-realtime",
};
