"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type FollowButtonProps = {
  targetUserId: string;
  initialFollowing: boolean;
};

export function FollowButton({ targetUserId, initialFollowing }: FollowButtonProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFollowing(initialFollowing);
    setError(null);
  }, [initialFollowing, targetUserId]);

  const refreshFollowing = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const { data, error: selErr } = await supabase
      .from("profile_follow")
      .select("follower_id")
      .eq("follower_id", uid)
      .eq("following_id", targetUserId)
      .maybeSingle();
    if (selErr) return;
    setFollowing(Boolean(data));
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
      const { error: delErr } = await supabase
        .from("profile_follow")
        .delete()
        .eq("follower_id", uid)
        .eq("following_id", targetUserId);
      if (delErr) {
        setError(delErr.message);
        setLoading(false);
        return;
      }
      setFollowing(false);
    } else {
      const { error: insErr } = await supabase
        .from("profile_follow")
        .insert({ follower_id: uid, following_id: targetUserId });
      if (insErr) {
        setError(insErr.message);
        setLoading(false);
        return;
      }
      setFollowing(true);
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
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
