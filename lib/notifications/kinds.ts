export const NOTIFICATION_KINDS = [
  "unlock",
  "new_follower",
  "impression",
  "dedication",
  "test",
  "admin_new_signup",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
