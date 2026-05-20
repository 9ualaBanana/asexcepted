import { NextResponse } from "next/server";
import {
  readFirebasePushConfigFromEnv,
  serializeFirebasePushConfigScript,
} from "@/lib/push/firebase-sw-config";

export async function GET() {
  const config = readFirebasePushConfigFromEnv();
  if (!config) {
    return new NextResponse("// Firebase push config is not configured", {
      status: 503,
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  return new NextResponse(serializeFirebasePushConfigScript(config), {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
