import { type NextRequest, NextResponse } from "next/server";

import { allowRateLimit } from "@/lib/embed-rate-limit";
import { updateSession } from "@/lib/supabase/update-session";

export async function proxy(request: NextRequest) {
  const res = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/embed/badge/")) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!allowRateLimit(`embed-view:${ip}`, 180, 60_000)) {
      return new NextResponse("Too many requests", { status: 429 });
    }
    res.headers.set("Content-Security-Policy", "frame-ancestors *");
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
