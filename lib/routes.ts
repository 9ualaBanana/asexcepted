/**
 * Central route map — avoid scattering path string literals.
 */

export const ROUTES = {
  home: "/",
  feed: "/feed",
  social: "/social",
  profile: "/profile",
  login: "/auth/login",
  signUp: "/auth/sign-up",
  signUpSuccess: "/auth/sign-up-success",
  confirm: "/auth/confirm",
  callback: "/auth/callback",
  forgotPassword: "/auth/forgot-password",
  updatePassword: "/auth/update-password",
  authError: "/auth/error",
  /** Legacy; redirects to user collection */
  achievementsLegacy: "/achievements",
  friendsLegacy: "/friends",
  firebaseMessagingSw: "/firebase-messaging-sw.js",
  firebasePushConfig: "/firebase-push-config.js",
} as const;

export const PROTECTED_PREFIXES = [
  ROUTES.feed,
  ROUTES.social,
  ROUTES.profile,
  ROUTES.achievementsLegacy,
] as const;

const DEFAULT_POST_AUTH = ROUTES.feed;

/** Internal paths only — blocks open redirects. */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return DEFAULT_POST_AUTH;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_POST_AUTH;
  }
  if (trimmed.startsWith("/auth/") && trimmed !== ROUTES.updatePassword) {
    return DEFAULT_POST_AUTH;
  }
  return trimmed;
}

export function userCollection(userId: string): string {
  return `/u/${userId}`;
}

export function userAchievementDetail(
  userId: string,
  achievementId: string,
  isDedication?: boolean,
): string {
  return `${userCollection(userId)}?achievement=${encodeURIComponent(achievementId)}${isDedication ? "&dedication=1" : ""}`;
}

export function loginWithNext(next: string): string {
  const path = safeRedirectPath(next);
  return `${ROUTES.login}?next=${encodeURIComponent(path)}`;
}

export function authCallbackUrl(origin: string, next?: string): string {
  const base = `${origin.replace(/\/$/, "")}${ROUTES.callback}`;
  if (!next) return base;
  return `${base}?next=${encodeURIComponent(safeRedirectPath(next))}`;
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPath(pathname: string): boolean {
  return pathname.startsWith("/auth/");
}

export function defaultPostAuthPath(userId: string): string {
  return ROUTES.feed;
}
