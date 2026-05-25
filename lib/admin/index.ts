import { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export function requireAdminUser(
    user: User | null | undefined,
): NextResponse | null {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;}

export function isAdmin(userId: string | null | undefined): boolean {
    const adminId = getAdminUserId();
    if (!adminId || !userId) return false;
    return userId === adminId;
}
  
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
  
  