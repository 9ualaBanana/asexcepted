import { NextResponse } from "next/server";

/**
 * Legacy single-request upload (model + poster). Prefer the signed-upload flow
 * under /upload-url and /complete so large GLBs bypass serverless body limits.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "3D badge uploads use direct storage upload. Refresh the page and try again.",
    },
    { status: 410 },
  );
}
