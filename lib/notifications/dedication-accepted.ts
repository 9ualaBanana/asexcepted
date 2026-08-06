import "server-only";

import { getAchievementDedicationNotifyRow } from "@/lib/achievements/persistence/achievements";
import { sendPushToUsers } from "@/lib/notifications/send";
import { resolveDisplayName } from "@/lib/notifications/templates";
import { createServiceRoleSupabase } from "@/lib/supabase/clients/server";

export async function notifyDedicationAccepted(achievementId: string): Promise<void> {
  try {
    await notifyDedicationAcceptedInner(achievementId);
  } catch {
    // Push / display-name lookup must never break accept.
  }
}

async function notifyDedicationAcceptedInner(achievementId: string): Promise<void> {
  const supabase = createServiceRoleSupabase();
  const achievementResult = await getAchievementDedicationNotifyRow(
    supabase,
    achievementId,
  );
  if (achievementResult.isErr()) return;
  const achievement = achievementResult.value;

  const dedicatorUserId = achievement.dedicated_by_user_id?.trim() ?? "";
  if (!dedicatorUserId || achievement.dedication_status !== "accepted") {
    return;
  }

  const recipientUserId = achievement.user_id?.trim() ?? "";
  if (!recipientUserId) return;

  const recipientName = await resolveDisplayName(supabase, recipientUserId);
  const achievementTitle = achievement.title?.trim() || "an achievement";

  try {
    await sendPushToUsers({
      userIds: [dedicatorUserId],
      kind: "dedication_accepted",
      params: {
        recipientName,
        achievementTitle,
        recipientUserId,
        achievementId: achievement.id,
      },
      excludeUserIds: [recipientUserId],
    });
  } catch {
    // Push is best-effort; acceptance must succeed without FCM configured.
  }
}
