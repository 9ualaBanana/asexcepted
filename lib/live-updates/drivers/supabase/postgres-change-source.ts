import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  LiveUpdateDispose,
  LiveUpdateNotify,
  LiveUpdateSource,
} from "@/lib/live-updates/core/types";
import { createDebouncedNotify } from "@/lib/live-updates/core/debounce-notify";

export type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE";

export type PostgresChangeListener = {
  table: string;
  schema?: string;
  event?: PostgresChangeEvent;
  filter?: string;
};

export type PostgresChangePayload = {
  table: string;
  event: PostgresChangeEvent;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

export type CreateSupabasePostgresChangeSourceOptions = {
  client: SupabaseClient;
  sourceId: string;
  channelName: string;
  listeners: PostgresChangeListener[];
  shouldNotify?: (payload: PostgresChangePayload) => boolean;
  debounceMs?: number;
};

/**
 * Supabase Realtime: postgres_changes subscriptions on one channel.
 */
export function createSupabasePostgresChangeSource(
  options: CreateSupabasePostgresChangeSourceOptions,
): LiveUpdateSource {
  const {
    client,
    sourceId,
    channelName,
    listeners,
    shouldNotify = () => true,
    debounceMs = 400,
  } = options;

  return {
    sourceId,
    start(onNotify: LiveUpdateNotify): LiveUpdateDispose {
      const emit = createDebouncedNotify(onNotify, debounceMs);
      let channel = client.channel(channelName);

      for (const listener of listeners) {
        const event = listener.event ?? "INSERT";
        channel = channel.on(
          "postgres_changes",
          {
            event,
            schema: listener.schema ?? "public",
            table: listener.table,
            filter: listener.filter,
          },
          (payload) => {
            const row =
              (payload.new as Record<string, unknown> | undefined) ??
              (payload.old as Record<string, unknown> | undefined);
            if (!row && event !== "DELETE") return;

            const change: PostgresChangePayload = {
              table: listener.table,
              event,
              new: (payload.new as Record<string, unknown> | null) ?? null,
              old: (payload.old as Record<string, unknown> | null) ?? null,
            };

            if (shouldNotify(change)) {
              emit();
            }
          },
        );
      }

      channel.subscribe();

      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}

/** @deprecated Use createSupabasePostgresChangeSource */
export const createSupabasePostgresInsertSource = createSupabasePostgresChangeSource;

export type PostgresInsertListener = PostgresChangeListener;
