import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotificationKind } from "@/lib/notifications/kinds";
import { notificationLinks } from "@/lib/notifications/links";

export type NotificationContent = {
  title: string;
  body: string;
  url: string;
  type: string;
};

export type UnlockParams = {
  actorName: string;
  achievementTitle: string;
  ownerUserId: string;
  achievementId: string;
};

export type NewFollowerParams = {
  followerName: string;
};

export type ImpressionParams = {
  achievementTitle: string;
  actorName: string;
  ownerUserId: string;
  achievementId: string;
};

export type TestParams = Record<string, never>;

export type AdminNewSignupParams = {
  userId: string;
  email?: string;
};

export type NotificationParams = {
  unlock: UnlockParams;
  new_follower: NewFollowerParams;
  impression: ImpressionParams;
  test: TestParams;
  admin_new_signup: AdminNewSignupParams;
};

const links = notificationLinks();

export async function resolveDisplayName(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: label, error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("public_user_display_name", { target_user_id: userId });

  if (error || typeof label !== "string") return "Someone";
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : "Someone";
}

export function buildNotificationContent<K extends NotificationKind>(
  kind: K,
  params: NotificationParams[K],
): NotificationContent {
  switch (kind) {
    case "unlock": {
      const p = params as UnlockParams;
      const title = `${p.actorName} unlocked an achievement`;
      const body =
        p.achievementTitle.trim() || "Open AsExcepted to see what they earned.";
      return {
        title,
        body,
        url: links.achievementDetail(p.ownerUserId, p.achievementId),
        type: "unlock",
      };
    }
    case "new_follower": {
      const p = params as NewFollowerParams;
      return {
        title: "New inspiration",
        body: `${p.followerName} is now inspired by you`,
        url: links.social,
        type: "new_follower",
      };
    }
    case "impression": {
      const p = params as ImpressionParams;
      const title = p.achievementTitle.trim() || "Achievement";
      return {
        title: "New impression",
        body: `${title} left impression on ${p.actorName}`,
        url: links.achievementDetail(p.ownerUserId, p.achievementId),
        type: "impression",
      };
    }
    case "test":
      return {
        title: "AsExcepted test notification",
        body: "Push is wired correctly for this profile.",
        url: links.profile,
        type: "push.test",
      };
    case "admin_new_signup": {
      const p = params as AdminNewSignupParams;
      return {
        title: "AsExcepted: New signup",
        body: p.email
          ? `New user signed up: ${p.email}`
          : `New user signed up: ${p.userId}`,
        url: links.home,
        type: "auth.signup.succeeded",
      };
    }
    default:
      return {
        title: "AsExcepted",
        body: "You have a new notification.",
        url: links.feed,
        type: "generic",
      };
  }
}
