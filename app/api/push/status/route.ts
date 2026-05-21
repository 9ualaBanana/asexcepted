import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";

  if (token.length >= 20) {
    const { count, error } = await supabase
      .from("push_notification_tokens" as any)
      .select("token", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("token", token);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const registeredForDevice = (count ?? 0) > 0;
    return NextResponse.json({
      registeredForDevice,
      hasToken: registeredForDevice,
    });
  }

  const { count, error } = await supabase
    .from("push_notification_tokens" as any)
    .select("token", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hasToken = (count ?? 0) > 0;
  return NextResponse.json({ hasToken, registeredForDevice: hasToken });
}
