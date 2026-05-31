import { NextResponse } from "next/server";
import { z } from "zod";

import { createSignedBadgeModelUrl } from "@/lib/achievements/badge/badge-assets-server";

const badgeModelUrlBodySchema = z.object({
  assetPath: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const body = badgeModelUrlBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return NextResponse.json({ error: "Invalid badge model payload." }, { status: 400 });
  }

  try {
    const signedUrl = await createSignedBadgeModelUrl(body.data.assetPath);
    return NextResponse.json({ signedUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create a signed badge model URL.",
      },
      { status: 500 },
    );
  }
}
