import { NextResponse } from "next/server";

import {
  BADGE_MODEL_MAX_FILE_BYTES,
  isGlbHeader,
  looksLikeGlbUpload,
} from "@/lib/achievements/badge-assets";
import {
  isAchievementBadgePreviewTooLarge,
  uploadAchievementBadgeModelAsset,
} from "@/lib/achievements/badge-assets-server";
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

  const model = asFile(formData.get("model"));
  const poster = asFile(formData.get("poster"));

  if (!model || !poster) {
    return NextResponse.json(
      { error: "Both the GLB model and generated poster are required." },
      { status: 400 },
    );
  }

  if (!looksLikeGlbUpload(model.name, model.type)) {
    return NextResponse.json(
      { error: "Only .glb uploads are supported for 3D badges." },
      { status: 400 },
    );
  }

  if (model.size > BADGE_MODEL_MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "3D badge files must be 50 MB or smaller." },
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
    const modelBuffer = await model.arrayBuffer();
    if (!isGlbHeader(modelBuffer)) {
      return NextResponse.json(
        { error: "This file is not a valid GLB asset." },
        { status: 400 },
      );
    }

    const posterBuffer = await poster.arrayBuffer();
    if (isAchievementBadgePreviewTooLarge(posterBuffer)) {
      return NextResponse.json(
        { error: "The generated badge preview is too large." },
        { status: 400 },
      );
    }

    const uploaded = await uploadAchievementBadgeModelAsset({
      userId: user.id,
      modelBuffer,
      previewBuffer: posterBuffer,
    });

    return NextResponse.json(uploaded);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not upload this 3D badge asset.",
      },
      { status: 500 },
    );
  }
}
