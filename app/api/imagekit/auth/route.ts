/**
 * ImageKit client-upload signing (Uppy → browser → ImageKit).
 *
 * Replace these in `.env.local` (server-only except public key can duplicate):
 * - IMAGEKIT_PUBLIC_KEY   — Dashboard → Developer options → Public API key
 * - IMAGEKIT_PRIVATE_KEY  — same, Private API key (never expose to client except via this route’s response pairing w/ signature)
 * - IMAGEKIT_URL_ENDPOINT — e.g. https://ik.imagekit.io/your_imagekit_id
 * - IMAGEKIT_UPLOAD_FOLDER — optional, default "achievements" (folder path in media library)
 *
 * Database (Supabase): store ImageKit `fileId` from upload responses in column
 *   icon_file_id text null
 * alongside icon_url so files can be removed from ImageKit when the badge or
 * achievement is deleted.
 */
import ImageKit from "imagekit";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim() ?? "";
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim() ?? "";
  const folder =
    process.env.IMAGEKIT_UPLOAD_FOLDER?.trim() || "achievements";

  if (!publicKey || !privateKey || !urlEndpoint) {
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
    const imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
    const auth = imagekit.getAuthenticationParameters();

    return NextResponse.json({
      token: auth.token,
      expire: auth.expire,
      signature: auth.signature,
      publicKey,
      folder,
    });
  } catch (e) {
    console.error("ImageKit auth error", e);
    return NextResponse.json(
      { error: "Failed to create upload signature." },
      { status: 500 },
    );
  }
}
