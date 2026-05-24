"use client";

import { useCallback } from "react";

import { createFeedLiveUpdateSource } from "@/lib/live-updates/domains/feed/create-feed-live-update-source";
import { useLiveUpdateSubscription } from "@/lib/live-updates/react/use-live-update-subscription";
import { createClient } from "@/lib/supabase/client";

type UseFeedLiveUpdatesOptions = {
  enabled: boolean;
  userId: string | null;
  onInvalidate: () => void;
};

/**
 * While on the feed page, refresh when unlocks / impressions / follows change on the server.
 */
export function useFeedLiveUpdates({
  enabled,
  userId,
  onInvalidate,
}: UseFeedLiveUpdatesOptions) {
  const createSource = useCallback(() => {
    if (!userId) return null;
    const supabase = createClient();
    return createFeedLiveUpdateSource({ client: supabase, userId });
  }, [userId]);

  useLiveUpdateSubscription({
    enabled: enabled && !!userId,
    createSource,
    onInvalidate,
  });
}
