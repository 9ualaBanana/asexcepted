import { getAdminUserId } from "@/lib/notifications/constants";

export function isAdminUserId(userId: string | null | undefined): boolean {
  const adminId = getAdminUserId();
  if (!adminId || !userId) return false;
  return userId === adminId;
}
