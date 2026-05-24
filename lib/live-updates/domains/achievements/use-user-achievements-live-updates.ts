"use client";

import { useCallback, useEffect, useState } from "react";

import { createUserAchievementsLiveUpdateSource } from "@/lib/live-updates/domains/achievements/create-user-achievements-live-update-source";
import { useLiveUpdateSubscription } from "@/lib/live-updates/react/use-live-update-subscription";
import { createClient } from "@/lib/supabase/client";

type UseUserAchievementsLiveUpdatesOptions = {
  /** Viewing someone else's collection (not owner edit mode). */
  enabled: boolean;
  profileUserId: string;
  onInvalidate: () => void;
};

/**
 * While viewing another user's achievements, refresh the grid when they change their collection.
 */
export function useUserAchievementsLiveUpdates({
  enabled,
  profileUserId,
  onInvalidate,
}: UseUserAchievementsLiveUpdatesOptions) {
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setViewerId(data.user?.id ?? null);
    });
  }, []);

  const watchingOtherUser =
    !!viewerId && viewerId !== profileUserId;

  const createSource = useCallback(() => {
    if (!watchingOtherUser) return null;
    const supabase = createClient();
    return createUserAchievementsLiveUpdateSource({
      client: supabase,
      profileUserId,
    });
  }, [profileUserId, watchingOtherUser]);

  useLiveUpdateSubscription({
    enabled: enabled && watchingOtherUser,
    createSource,
    onInvalidate,
  });
}
