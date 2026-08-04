import type { DatabaseSupabaseClient } from "@/lib/supabase/clients/client-types";
import { createServiceRoleSupabase } from "@/lib/supabase/clients/server";
import { buildFcmWebPushMessage } from "@/lib/notifications/fcm";
import type { NotificationKind } from "@/lib/notifications/kinds";
import {
  buildNotificationContent,
  type NotificationParams,
} from "@/lib/notifications/templates";
import { getFirebaseAdminMessaging } from "@/lib/push/firebase-admin";
import { getAdminSignupsTopic, getAdminUserId } from "@/lib/admin";

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

export type SendPushResult = {
  ok: true;
  requested: number;
  successCount: number;
  failureCount: number;
  firstErrorCode: string | null;
};

async function loadTokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const admin = createServiceRoleSupabase() as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        in: (
          col: string,
          vals: string[],
        ) => Promise<{ data: Array<{ token?: string | null }> | null; error: unknown }>;
      };
    };
  };
  const { data, error } = await admin
    .from("push_notification_tokens")
    .select("token")
    .in("user_id", userIds);

  if (error) return [];

  return [
    ...new Set(
      (Array.isArray(data) ? data : [])
        .map((row) => row.token?.trim() ?? "")
        .filter((token): token is string => token.length > 0),
    ),
  ];
}

async function pruneStaleTokens(
  tokens: string[],
  responses: Array<{ success: boolean; error?: { code?: string } }>,
) {
  const stale: string[] = [];
  responses.forEach((response, index) => {
    if (response.success) return;
    const code = response.error?.code;
    if (code && INVALID_TOKEN_CODES.has(code)) {
      stale.push(tokens[index]!);
    }
  });
  if (stale.length === 0) return;
  const admin = createServiceRoleSupabase() as unknown as {
    from: (table: string) => {
      delete: () => { in: (col: string, vals: string[]) => Promise<unknown> };
    };
  };
  await admin.from("push_notification_tokens").delete().in("token", stale);
}

export async function sendPushToUsers<K extends NotificationKind>(args: {
  supabase: DatabaseSupabaseClient;
  userIds: string[];
  kind: K;
  params: NotificationParams[K];
  excludeUserIds?: string[];
}): Promise<SendPushResult> {
  const exclude = new Set(args.excludeUserIds ?? []);
  const targetIds = args.userIds.filter((id) => !exclude.has(id));
  const tokens = await loadTokensForUsers(targetIds);

  if (tokens.length === 0) {
    return {
      ok: true,
      requested: 0,
      successCount: 0,
      failureCount: 0,
      firstErrorCode: null,
    };
  }

  const content = buildNotificationContent(args.kind, args.params);
  const message = buildFcmWebPushMessage({
    tokens,
    title: content.title,
    body: content.body,
    url: content.url,
    type: content.type,
  });

  const result = await getFirebaseAdminMessaging().sendEachForMulticast(message);
  await pruneStaleTokens(tokens, result.responses);

  const firstError = result.responses.find((r) => !r.success)?.error?.code;

  return {
    ok: true,
    requested: tokens.length,
    successCount: result.successCount,
    failureCount: result.failureCount,
    firstErrorCode: firstError ?? null,
  };
}

/** Admin signup alert — tokens for admin uid and/or FCM topic subscription. */
export async function sendAdminNewSignupPush(args: {
  supabase: DatabaseSupabaseClient;
  userId: string;
  email?: string;
}): Promise<{ ok: boolean }> {
  const content = buildNotificationContent("admin_new_signup", {
    userId: args.userId,
    email: args.email,
  });

  const adminUserId = getAdminUserId();
  if (adminUserId) {
    const tokenResult = await sendPushToUsers({
      supabase: args.supabase,
      userIds: [adminUserId],
      kind: "admin_new_signup",
      params: { userId: args.userId, email: args.email },
    });

    if (tokenResult.requested > 0 && tokenResult.successCount > 0) {
      return { ok: true };
    }
  }

  try {
    await getFirebaseAdminMessaging().send({
      topic: getAdminSignupsTopic(),
      notification: { title: content.title, body: content.body },
      data: {
        title: content.title,
        body: content.body,
        url: content.url,
        type: content.type,
        userId: args.userId,
      },
      webpush: {
        notification: {
          title: content.title,
          body: content.body,
          icon: "/icons/icon-192.png",
        },
        fcmOptions: { link: content.url },
      },
    });
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
