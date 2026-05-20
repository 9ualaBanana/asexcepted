import type { MulticastMessage } from "firebase-admin/messaging";

import { ROUTES } from "@/lib/routes";

export function formatUnlockPushCopy(args: {
  actorName: string;
  achievementTitle: string;
}): { title: string; body: string } {
  const title = `${args.actorName} unlocked an achievement`;
  const body = args.achievementTitle.trim() || "Open AsExcepted to see what they earned.";
  return { title, body };
}

export function buildFcmWebPushMessage(args: {
  tokens: string[];
  title: string;
  body: string;
  url?: string;
  icon?: string;
  type?: string;
}): MulticastMessage {
  const url = args.url ?? ROUTES.feed;
  const icon = args.icon ?? "/icons/icon-192.png";
  const type = args.type ?? "generic";

  return {
    tokens: args.tokens,
    notification: { title: args.title, body: args.body },
    data: {
      title: args.title,
      body: args.body,
      url,
      icon,
      type,
    },
    webpush: {
      notification: { title: args.title, body: args.body, icon },
      fcmOptions: { link: url },
    },
  };
}
