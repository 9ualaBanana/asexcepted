import type { LiveUpdateNotify } from "@/lib/live-updates/core/types";

/** Coalesce burst events (e.g. multiple Realtime payloads) into one refresh. */
export function createDebouncedNotify(
  onNotify: LiveUpdateNotify,
  waitMs = 400,
): LiveUpdateNotify {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onNotify();
    }, waitMs);
  };
}
