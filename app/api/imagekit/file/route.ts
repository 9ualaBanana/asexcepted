/**
 * Deletes a file from the ImageKit media library (server-side).
 * Requires a signed-in Supabase user. Tighten with ownership checks if needed.
 *
 * Env: same as /api/imagekit/auth (IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT).
 */
import ImageKit from "imagekit";
import { NextResponse } from "next/server";

import {
  isImageKitReachabilityError,
  logImageKitRouteError,
} from "@/lib/imagekit-route-errors";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fileId =
    typeof body === "object" &&
    body !== null &&
    "fileId" in body &&
    typeof (body as { fileId: unknown }).fileId === "string"
      ? (body as { fileId: string }).fileId.trim()
      : "";

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim() ?? "";
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim() ?? "";

  if (!publicKey || !privateKey || !urlEndpoint) {
    return NextResponse.json(
      { error: "ImageKit is not configured on the server." },
      { status: 503 },
    );
  }

  try {
    const imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
    await imagekit.deleteFile(fileId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logImageKitRouteError("ImageKit deleteFile", e, { fileId });
    if (isImageKitReachabilityError(e)) {
      return NextResponse.json(
        {
          error:
            "Could not reach ImageKit (network or DNS). Check internet access and that api.imagekit.io resolves, then try again.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to delete file from ImageKit." },
      { status: 500 },
    );
  }
}
