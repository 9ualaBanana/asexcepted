"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  countProfileFollowsForFollower,
  createProfileFollow,
  isUserFollowingProfile,
  removeProfileFollow,
} from "@/lib/user-profile-db";
import { useErrorToast } from "@/lib/toast";

type FollowButtonProps = {
  targetUserId: string;
  initialFollowing: boolean;
  /** Called after the user's first-ever follow (any profile). */
  onFirstFollow?: () => void;
};

export function FollowButton({
  targetUserId,
  initialFollowing,
  onFirstFollow,
}: FollowButtonProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useErrorToast(error, { id: "follow-button" });

  useEffect(() => {
    setFollowing(initialFollowing);
    setError(null);
  }, [initialFollowing, targetUserId]);

  const refreshFollowing = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const result = await isUserFollowingProfile(supabase, uid, targetUserId);
    if (result.isErr()) return;
    setFollowing(result.value);
  }, [supabase, targetUserId]);

  async function toggle() {
    setLoading(true);
    setError(null);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (userErr || !uid) {
      setError("Sign in to follow.");
      setLoading(false);
      return;
    }

    if (following) {
      const unfollowResult = await removeProfileFollow(supabase, uid, targetUserId);
      if (unfollowResult.isErr()) {
        setError(unfollowResult.error);
        setLoading(false);
        return;
      }
      setFollowing(false);
    } else {
      const followResult = await createProfileFollow(supabase, uid, targetUserId);
      if (followResult.isErr()) {
        setError(followResult.error);
        setLoading(false);
        return;
      }
      setFollowing(true);
      const countResult = await countProfileFollowsForFollower(supabase, uid);
      if (countResult.isOk() && countResult.value === 1) {
        onFirstFollow?.();
      }
      void fetch("/api/push/notify-new-follower", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          followingId: targetUserId,
          followerId: uid,
        }),
      }).catch(() => undefined);
    }
    setLoading(false);
    router.refresh();
    void refreshFollowing();
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant={following ? "secondary" : "default"}
        size="sm"
        disabled={loading}
        onClick={() => void toggle()}
      >
        {loading ? "…" : following ? "Unfollow" : "Follow"}
      </Button>
    </div>
  );
}
