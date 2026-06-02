import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAchievementDedicationNotifyRow } from "@/lib/achievements/data/achievement-queries";
import { sendPushToUsers } from "@/lib/notifications/send";
import { resolveDisplayName } from "@/lib/notifications/templates";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function notifyDedicationAccepted(args: {
  achievementId: string;
  supabase?: SupabaseClient;
}): Promise<void> {
  try {
    await notifyDedicationAcceptedInner(args);
  } catch {
    // Push / display-name lookup must never break accept.
  }
}

async function notifyDedicationAcceptedInner(args: {
  achievementId: string;
  supabase?: SupabaseClient;
}): Promise<void> {
  const supabase = args.supabase ?? createServiceRoleClient();
  const achievementResult = await getAchievementDedicationNotifyRow(
    supabase,
    args.achievementId,
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
      supabase,
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
