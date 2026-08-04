export const ROUTES = {
  home: "/",
  inspa: "/inspa",
  profile: "/profile",
  login: "/auth/login",
  confirm: "/auth/confirm",
  callback: "/auth/callback",
  invite: "/invite",
  authError: "/auth/error",
  firebaseMessagingSw: "/firebase-messaging-sw.js",
  firebasePushConfig: "/firebase-push-config.js",
} as const;

const DEFAULT_POST_AUTH = ROUTES.inspa;

export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return DEFAULT_POST_AUTH;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_POST_AUTH;
  }
  if (trimmed.startsWith("/auth/")) {
    return DEFAULT_POST_AUTH;
  }
  return trimmed;
}

export function userCollection(userId: string): string {
  return `/u/${userId}`;
}

export function achievementShareInvitePath(
  token: string,
  opts?: { claim?: boolean; autoAccept?: boolean },
): string {
  const base = `${ROUTES.invite}/${encodeURIComponent(token)}`;
  const params = new URLSearchParams();
  if (opts?.claim) {
    params.set("claim", "1");
  }
  if (opts?.autoAccept) {
    params.set("auto", "1");
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function achievementShareInviteOgImagePath(token: string): string {
  return `${ROUTES.invite}/${encodeURIComponent(token)}/opengraph-image`;
}

export function userAchievementDetail(
  userId: string,
  achievementId: string,
  isDedication?: boolean,
): string {
  return `${userCollection(userId)}?achievement=${encodeURIComponent(achievementId)}${isDedication ? "&dedication=1" : ""}`;
}

export function loginWithNext(next: string): string {
  return `${ROUTES.login}?next=${encodeURIComponent(safeRedirectPath(next))}`;
}

export function authCallbackUrl(origin: string, next?: string): string {
  const base = `${origin.replace(/\/$/, "")}${ROUTES.callback}`;
  if (!next) return base;
  return `${base}?next=${encodeURIComponent(safeRedirectPath(next))}`;
}

export function isAuthPath(pathname: string): boolean {
  return pathname.startsWith("/auth/");
}
