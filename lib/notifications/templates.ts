import type { SupabaseClient } from "@supabase/supabase-js";

import { formatDedicationActivityMessage } from "@/lib/feed/dedication-message";
import { formatImpressionActivityMessage } from "@/lib/feed/impression-message";
import type { NotificationKind } from "@/lib/notifications/kinds";
import { APP_DISPLAY_NAME } from "@/lib/brand";
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

export type DedicationParams = {
  senderName: string;
  achievementTitle: string;
  recipientUserId: string;
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
  dedication: DedicationParams;
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
        p.achievementTitle.trim() ||
        `Open ${APP_DISPLAY_NAME} to see what they earned.`;
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
      return {
        title: "New impression",
        body: formatImpressionActivityMessage(
          p.achievementTitle,
          p.actorName,
        ),
        url: links.achievementDetail(p.ownerUserId, p.achievementId),
        type: "impression",
      };
    }
    case "dedication": {
      const p = params as DedicationParams;
      return {
        title: "Dedicated achievement",
        body: formatDedicationActivityMessage(p.senderName, p.achievementTitle),
        url: `${links.achievementDetail(p.recipientUserId, p.achievementId)}&dedication=1`,
        type: "dedication",
      };
    }
    case "test":
      return {
        title: `${APP_DISPLAY_NAME} test notification`,
        body: "Push is wired correctly for this profile.",
        url: links.profile,
        type: "push.test",
      };
    case "admin_new_signup": {
      const p = params as AdminNewSignupParams;
      return {
        title: `${APP_DISPLAY_NAME}: New signup`,
        body: p.email
          ? `New user signed up: ${p.email}`
          : `New user signed up: ${p.userId}`,
        url: links.home,
        type: "auth.signup.succeeded",
      };
    }
    default:
      return {
        title: APP_DISPLAY_NAME,
        body: "You have a new notification.",
        url: links.feed,
        type: "generic",
      };
  }
}
