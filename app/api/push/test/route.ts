import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin";
import { sendPushToUsers } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const denied = requireAdminUser(user);
  if (denied) return denied;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("push_notification_tokens" as any)
    .select("token")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hasToken = Array.isArray(data) && data.length > 0;
  if (!hasToken) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No device token saved. Turn on Notifications in Profile (or use Send test push) on this device first.",
      },
      { status: 400 },
    );
  }

  const result = await sendPushToUsers({
    supabase,
    userIds: [user.id],
    kind: "test",
    params: {},
  });

  if (result.requested === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No device token saved. Turn on Notifications in Profile (or use Send test push) on this device first.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    requested: result.requested,
    successCount: result.successCount,
    failureCount: result.failureCount,
    firstErrorCode: result.firstErrorCode,
  });
}
