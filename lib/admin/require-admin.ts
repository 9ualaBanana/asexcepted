import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { isAdminUserId } from "@/lib/admin/is-admin-user";

export function requireAdminUser(
  user: User | null | undefined,
): NextResponse | null {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUserId(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
