/**
 * Admin push config (server env only).
 * PUSH_ADMIN_USER_ID — auth user id that receives signup alerts.
 * PUSH_ADMIN_SIGNUPS_TOPIC — FCM topic for admin devices (optional override).
 */

export function getAdminUserId(): string | null {
  const value = process.env.PUSH_ADMIN_USER_ID?.trim();
  return value && value.length > 0 ? value : null;
}

export function getAdminSignupsTopic(): string {
  return process.env.PUSH_ADMIN_SIGNUPS_TOPIC?.trim() || "admin-signups";
}
