import { NextResponse } from "next/server";

import { createBadgeModelUploadTarget } from "@/lib/achievements/badge/badge-assets-server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to upload 3D badge assets." },
      { status: 401 },
    );
  }

  try {
    const target = await createBadgeModelUploadTarget(user.id);
    return NextResponse.json(target);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not prepare 3D badge upload.",
      },
      { status: 500 },
    );
  }
}
