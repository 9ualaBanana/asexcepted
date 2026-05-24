import type { FeedRow } from "@/lib/feed-db";

/** Particle effects + violet row styling for dedication inbox and dedicated unlocks. */
export function feedRowShowsDedicatedBadge(row: FeedRow): boolean {
  return row.event_type === "dedication" || row.is_dedicated;
}
