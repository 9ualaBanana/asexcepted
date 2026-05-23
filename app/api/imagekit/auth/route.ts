/**
 * ImageKit client-upload signing (Uppy → browser → ImageKit).
 *
 * Replace these in `.env.local` (server-only except public key can duplicate):
 * - IMAGEKIT_PUBLIC_KEY   — Dashboard → Developer options → Public API key
 * - IMAGEKIT_PRIVATE_KEY  — same, Private API key (never expose to client except via this route’s response pairing w/ signature)
 * - IMAGEKIT_URL_ENDPOINT — e.g. https://ik.imagekit.io/your_imagekit_id
 * - IMAGEKIT_UPLOAD_BASE_FOLDER — optional, default "achievements" (badge folder prefix)
 *
 * Profile avatars upload to `{achievements}/{userId}/profile/` with `avatar` filename prefix (unique per upload).
 *
 * Database (Supabase): store ImageKit `fileId` from upload responses in column
 *   icon_file_id text null
 * alongside icon_url so files can be removed from ImageKit when the badge or
 * achievement is deleted.
 */
import { NextResponse } from "next/server";

import {
  isImageKitReachabilityError,
  logImageKitRouteError,
} from "@/lib/imagekit-route-errors";
import {
  getImageKitServerClient,
  isImageKitServerConfigured,
} from "@/lib/imagekit/server-client";
import { createClient } from "@/lib/supabase/server";

type UploadPurpose = "badge" | "avatar";

function parseUploadPurpose(body: unknown): UploadPurpose {
  if (
    typeof body === "object" &&
    body !== null &&
    "purpose" in body &&
    (body as { purpose?: string }).purpose === "avatar"
  ) {
    return "avatar";
  }
  return "badge";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let purpose: UploadPurpose = "badge";
  try {
    const body = await request.json();
    purpose = parseUploadPurpose(body);
  } catch {
    // empty body → badge uploads (legacy clients)
  }

  const uploadBaseFolderRaw =
    process.env.IMAGEKIT_UPLOAD_BASE_FOLDER?.trim() || "achievements";
  const uploadBaseFolder = uploadBaseFolderRaw.replace(/^\/+|\/+$/g, "");
  const folder =
    purpose === "avatar"
        ? `${uploadBaseFolder}/${user.id}/profile`
        : `${uploadBaseFolder}/${user.id}`;

  if (!isImageKitServerConfigured()) {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim() ?? "";
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim() ?? "";
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim() ?? "";
    return NextResponse.json(
      {
        error: "ImageKit is not configured on the server.",
        missing: {
          IMAGEKIT_PUBLIC_KEY: !publicKey,
          IMAGEKIT_PRIVATE_KEY: !privateKey,
          IMAGEKIT_URL_ENDPOINT: !urlEndpoint,
        },
      },
      { status: 503 },
    );
  }

  try {
    const imagekit = getImageKitServerClient();
    const auth = imagekit.getAuthenticationParameters();
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim() ?? "";

    return NextResponse.json({
      token: auth.token,
      expire: auth.expire,
      signature: auth.signature,
      publicKey,
      folder,
    });
  } catch (e) {
    logImageKitRouteError("ImageKit auth error", e);
    if (isImageKitReachabilityError(e)) {
      return NextResponse.json(
        {
          error:
            "Could not reach ImageKit (network or DNS). Check connectivity and DNS for api.imagekit.io.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create upload signature." },
      { status: 500 },
    );
  }
}
