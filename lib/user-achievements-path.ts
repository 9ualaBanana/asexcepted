/** Path to the signed-in user's achievements page (`/u/:authUserId`). */
export function userAchievementsPath(authUserId: string): string {
  return `/u/${authUserId}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True if `value` looks like a Supabase Auth user UUID (path segment under `/u/`). */
export function isAuthUserIdSegment(value: string): boolean {
  return UUID_RE.test(value.trim());
}
