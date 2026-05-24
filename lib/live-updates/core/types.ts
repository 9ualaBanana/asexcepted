/**
 * Live updates: notify the client when server-side data changes so UI can refresh.
 * Transport is pluggable (Supabase Realtime today; polling/SSE later).
 */

export type LiveUpdateDispose = () => void;

/** Called when the source detects a relevant backend change. */
export type LiveUpdateNotify = () => void;

/**
 * A feature-scoped subscription (feed, notifications, …).
 * Call `start` once; invoke `onNotify` when data may have changed.
 */
export interface LiveUpdateSource {
  readonly sourceId: string;
  start(onNotify: LiveUpdateNotify): LiveUpdateDispose;
}

/** Factory for creating sources (used by domain hooks). */
export interface LiveUpdateDriver {
  readonly driverId: string;
}
