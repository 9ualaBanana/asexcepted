"use client";

const PUSH_CLICK_MESSAGE = "push-notification-click";

export type PushNotificationClickMessage = {
  type: typeof PUSH_CLICK_MESSAGE;
  url: string;
  path: string;
};

export function pathFromPushNotificationUrl(
  raw: string | undefined,
  origin?: string,
): string {
  const fallback = "/inspa";
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost");

  try {
    const parsed = new URL(trimmed, base);
    if (parsed.origin !== new URL(base).origin) return fallback;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path.startsWith("/") ? path : fallback;
  } catch {
    return trimmed.startsWith("/") ? trimmed : fallback;
  }
}

export function navigateFromPushNotification(
  push: (href: string) => void,
  rawUrl: string | undefined,
): void {
  push(pathFromPushNotificationUrl(rawUrl));
}

export function attachPushNotificationClickHandler(
  notification: Notification,
  onNavigate: (url: string | undefined) => void,
  rawUrl: string | undefined,
): void {
  notification.onclick = (event) => {
    event.preventDefault();
    notification.close();
    window.focus();
    onNavigate(rawUrl);
  };
}

export function isPushNotificationClickMessage(
  data: unknown,
): data is PushNotificationClickMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as PushNotificationClickMessage;
  return msg.type === PUSH_CLICK_MESSAGE && typeof msg.path === "string";
}

export function listenForPushNotificationClicks(
  push: (href: string) => void,
): () => void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return () => undefined;
  }

  const handler = (event: MessageEvent) => {
    if (!isPushNotificationClickMessage(event.data)) return;
    push(pathFromPushNotificationUrl(event.data.path || event.data.url));
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
