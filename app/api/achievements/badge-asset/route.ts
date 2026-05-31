import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteBadgeRemoteAsset } from "@/lib/achievements/badge-assets-server";
import { createClient } from "@/lib/supabase/server";

const deleteBadgeAssetBodySchema = z.object({
  iconUrl: z.string().nullable().optional(),
  iconFileId: z.string().nullable().optional(),
  iconAssetKind: z.enum(["image", "model_glb"]).optional(),
  iconAssetPath: z.string().nullable().optional(),
});

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = deleteBadgeAssetBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return NextResponse.json({ error: "Invalid badge asset delete payload." }, { status: 400 });
  }

  try {
    await deleteBadgeRemoteAsset({
      iconUrl: body.data.iconUrl ?? null,
      iconFileId: body.data.iconFileId ?? null,
      iconAssetPath: body.data.iconAssetPath ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not delete this badge asset.",
      },
      { status: 500 },
    );
  }
}
