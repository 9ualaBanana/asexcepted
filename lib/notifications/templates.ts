import type { SupabaseClient } from "@supabase/supabase-js";

import {
  formatDedicationAcceptedActivityMessage,
  formatDedicationActivityMessage,
  formatImpressionActivityMessage,
  formatNewInspirationActivityMessage,
  formatUnlockActivityMessage,
} from "@/lib/activity-text";
import { APP_DISPLAY_NAME } from "@/lib/brand";
import type { NotificationKind } from "@/lib/notifications/kinds";
import { ROUTES, userAchievementDetail } from "../routes";

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
  sender: string;
  achievementTitle: string;
  recipientUserId: string;
  achievementId: string;
};

export type DedicationAcceptedParams = {
  recipientName: string;
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
  dedication_accepted: DedicationAcceptedParams;
  test: TestParams;
  admin_new_signup: AdminNewSignupParams;
};

export function notificationLinks() {
  return {
    feed: ROUTES.inspa,
    social: ROUTES.inspa,
    profile: ROUTES.profile,
    home: ROUTES.home,
    userCollection: (userId: string) => `/u/${userId}`,
    achievementDetail: userAchievementDetail,
  };
}

export const links = notificationLinks();

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
    case "new_follower": {
      const p = params as NewFollowerParams;
      return {
        title: "New inspiration",
        body: formatNewInspirationActivityMessage(p.followerName),
        url: links.social,
        type: "new_follower",
      };
    }
    case "unlock": {
      const p = params as UnlockParams;
      const title = `${p.actorName} unlocked an achievement`;
      const body = formatUnlockActivityMessage(p.achievementTitle, p.actorName);
      return {
        title,
        body,
        url: links.achievementDetail(p.ownerUserId, p.achievementId),
        type: "unlock",
      };
    }
    case "impression": {
      const p = params as ImpressionParams;
      return {
        title: "New impression",
        body: formatImpressionActivityMessage(p.achievementTitle, p.actorName),
        url: links.achievementDetail(p.ownerUserId, p.achievementId),
        type: "impression",
      };
    }
    case "dedication": {
      const p = params as DedicationParams;
      return {
        title: "Dedicated achievement",
        body: formatDedicationActivityMessage(p.achievementTitle, p.sender),
        url: links.achievementDetail(p.recipientUserId, p.achievementId, true),
        type: "dedication",
      };
    }
    case "dedication_accepted": {
      const p = params as DedicationAcceptedParams;
      return {
        title: "Dedication accepted",
        body: formatDedicationAcceptedActivityMessage(
          p.achievementTitle,
          p.recipientName,
        ),
        url: links.achievementDetail(p.recipientUserId, p.achievementId),
        type: "dedication_accepted",
      };
    }
    case "test":
      return {
        title: `Test notification`,
        body: "Push is wired correctly for this profile.",
        url: links.profile,
        type: "push.test",
      };
    case "admin_new_signup": {
      const p = params as AdminNewSignupParams;
      return {
        title: `New user signed up`,
        body: `Email: ${p.email}`,
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
