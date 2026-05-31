import "server-only";

import {
  BADGE_MODEL_BUCKET,
  BADGE_PREVIEW_BUCKET,
  buildShareInviteBadgeModelPath,
  buildShareInviteBadgePreviewPath,
} from "@/lib/achievements/badge/badge-assets";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Removes a pending invite created during a failed dedicate/share flow. */
export async function deleteShareInviteRollback(
  inviteId: string,
  supabase = createServiceRoleClient(),
): Promise<void> {
  await supabase.from("achievement_share_invites").delete().eq("id", inviteId);

  const modelPath = buildShareInviteBadgeModelPath(inviteId);
  const previewPath = buildShareInviteBadgePreviewPath(inviteId);
  await supabase.storage.from(BADGE_MODEL_BUCKET).remove([modelPath]);
  await supabase.storage.from(BADGE_PREVIEW_BUCKET).remove([previewPath]);
}
