/**
 * Product policy: follower unlock notifications and unlock feed rows are only
 * emitted for **public** achievements. Private unlocks stay on the owner's
 * collection only — do not change this unless explicitly requested.
 */
export const FOLLOWER_UNLOCK_NOTIFICATIONS_REQUIRE_PUBLIC_VISIBILITY = true;
