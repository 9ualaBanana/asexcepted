export const NOTIFICATION_KINDS = [
  "unlock",
  "new_follower",
  "impression",
  "dedication",
  "dedication_accepted",
  "test",
  "admin_new_signup",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
