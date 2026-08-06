import { NextResponse } from "next/server";
import { z } from "zod";

import { createDedicationPort } from "@/lib/achievements/application/adapters";
import { acceptPendingDedication } from "@/lib/achievements/application/dedication-queue";
import { notifyDedicationAccepted } from "@/lib/notifications/dedication-accepted";
import { createServerSupabase } from "@/lib/supabase/clients/server";

const bodySchema = z.object({
  achievementId: z.uuid(),
});

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const acceptResult = await acceptPendingDedication(
    parsed.data.achievementId,
    user.id,
    createDedicationPort(supabase),
  );

  if (acceptResult.isErr()) {
    const message = acceptResult.error;
    const status =
      message === "This dedication is no longer pending or was already accepted."
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const achievement = acceptResult.value;

  void notifyDedicationAccepted({
    achievementId: achievement.id,
    supabase,
  }).catch(() => undefined);

  return NextResponse.json({ achievement });
}
