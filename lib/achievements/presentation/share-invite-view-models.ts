import type { Achievement } from "@/lib/achievements/domain/achievement";
import type { AchievementShareInviteCreateV2 } from "@/lib/achievements/domain/share-invite";

export type AchievementShareInvitePresentation = {
  invite: AchievementShareInviteCreateV2;
  snapshot: Achievement;
  senderDisplayName: string;
  ownerUserId: string;
  ownerDisplayName: string;
};
