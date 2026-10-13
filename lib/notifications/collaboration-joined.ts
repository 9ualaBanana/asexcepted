import "server-only";

import { sendPushToUsers } from "@/lib/notifications/send";
import { resolveDisplayName } from "@/lib/notifications/templates";
import { createServiceRoleSupabase } from "@/lib/supabase/clients/server";

export async function notifyCollaborationJoined(args: {
  achievementId: string;
  claimerUserId: string;
  senderUserId: string;
}): Promise<void> {
  try {
    await notifyCollaborationJoinedInner(args);
  } catch {
    // Push must never break a successful claim.
  }
}

async function notifyCollaborationJoinedInner(args: {
  achievementId: string;
  claimerUserId: string;
  senderUserId: string;
}): Promise<void> {
  if (!args.senderUserId || args.senderUserId === args.claimerUserId) return;

  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("achievements")
    .select("id,user_id,title")
    .eq("id", args.achievementId)
    .maybeSingle();

  if (error || !data) return;

  const claimerName = await resolveDisplayName(supabase, args.claimerUserId);
  const achievementTitle = data.title?.trim() || "an achievement";

  try {
    await sendPushToUsers({
      userIds: [args.senderUserId],
      kind: "collaboration_joined",
      params: {
        claimerName,
        achievementTitle,
        ownerUserId: data.user_id,
        achievementId: data.id,
      },
      excludeUserIds: [args.claimerUserId],
    });
  } catch {
    // Push is best-effort.
  }
}
