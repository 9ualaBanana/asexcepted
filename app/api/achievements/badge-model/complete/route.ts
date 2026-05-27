import { NextResponse } from "next/server";

import { completeAchievementBadgeModelUpload } from "@/lib/achievements/badge-assets-server";
import { createClient } from "@/lib/supabase/server";

function asFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File ? value : null;
}

export async function POST(request: Request) {
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

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid upload body." }, { status: 400 });
  }

  const modelPath = formData.get("modelPath");
  const poster = asFile(formData.get("poster"));

  if (typeof modelPath !== "string" || !modelPath.trim() || !poster) {
    return NextResponse.json(
      { error: "Both the model path and generated poster are required." },
      { status: 400 },
    );
  }

  if (poster.type !== "image/png") {
    return NextResponse.json(
      { error: "The generated badge poster must be a PNG image." },
      { status: 400 },
    );
  }

  try {
    const posterBuffer = await poster.arrayBuffer();
    const uploaded = await completeAchievementBadgeModelUpload({
      userId: user.id,
      modelPath: modelPath.trim(),
      previewBuffer: posterBuffer,
    });

    return NextResponse.json(uploaded);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not finalize this 3D badge asset.",
      },
      { status: 500 },
    );
  }
}
