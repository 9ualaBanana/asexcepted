import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin";
import { formatDedicationActivityMessage } from "@/lib/feed/dedication-message";
import { resolveDisplayName, sendPushToUsers } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const bodySchema = z.object({
  recipientUserId: z.string().uuid(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  icon: z.string().optional(),
  icon_url: z.string().nullable().optional(),
  icon_file_id: z.string().nullable().optional(),
  tone: z.string().optional(),
  achieved_at: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: admin },
  } = await supabase.auth.getUser();

  const denied = requireAdminUser(admin);
  if (denied) return denied;
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.recipientUserId === admin.id) {
    return NextResponse.json(
      { error: "Use your own collection to create achievements for yourself." },
      { status: 400 },
    );
  }

  const service = createServiceRoleClient();
  const { data: row, error: insertError } = await service
    .from("achievements")
    .insert({
      user_id: parsed.data.recipientUserId,
      title: parsed.data.title ?? null,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      icon: parsed.data.icon ?? "trophy",
      icon_url: parsed.data.icon_url ?? null,
      icon_file_id: parsed.data.icon_file_id ?? null,
      tone: parsed.data.tone ?? "teal",
      is_locked: true,
      achieved_at: parsed.data.achieved_at ?? null,
      visibility: "public",
      dedicated_by_user_id: admin.id,
      dedication_status: "pending",
    })
    .select("id, title")
    .single();

  if (insertError || !row) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not create dedication." },
      { status: 500 },
    );
  }

  const { error: eventError } = await service.from("achievement_dedication_events").insert({
    achievement_id: row.id,
    recipient_user_id: parsed.data.recipientUserId,
    sender_user_id: admin.id,
  });

  if (eventError) {
    await service.from("achievements").delete().eq("id", row.id);
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  const senderName = await resolveDisplayName(supabase, admin.id);
  const achievementTitle = row.title ?? "Achievement";

  await sendPushToUsers({
    supabase,
    userIds: [parsed.data.recipientUserId],
    kind: "dedication",
    params: {
      senderName,
      achievementTitle,
      recipientUserId: parsed.data.recipientUserId,
      achievementId: row.id,
    },
    excludeUserIds: [admin.id],
  });

  return NextResponse.json({
    ok: true,
    achievementId: row.id,
    pushBody: formatDedicationActivityMessage(senderName, achievementTitle),
  });
}
