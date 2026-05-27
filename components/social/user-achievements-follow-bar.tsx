"use client";

import { FollowButton } from "@/components/social/follow-button";
import { usePwaInstallTutorial } from "@/lib/pwa/use-pwa-install-tutorial";

type UserAchievementsFollowBarProps = {
  targetUserId: string;
  initialFollowing: boolean;
};

export function UserAchievementsFollowBar({
  targetUserId,
  initialFollowing,
}: UserAchievementsFollowBarProps) {
  const { onFirstFollow } = usePwaInstallTutorial();

  return (
    <FollowButton
      targetUserId={targetUserId}
      initialFollowing={initialFollowing}
      onFirstFollow={() => void onFirstFollow()}
    />
  );
}
