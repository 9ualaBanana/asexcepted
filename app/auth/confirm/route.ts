import { createClient } from "@/lib/supabase/server";
import { userAchievementsPath } from "@/lib/user-achievements-path";
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

/** Build a redirect URL that always matches the incoming request (host, proto, forwarded preview URL). */
function sameOriginRedirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function sameOriginRedirectWithSearch(request: NextRequest, pathname: string, searchParams: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  for (const [k, v] of Object.entries(searchParams)) {
    url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

/** `next` must be a same-origin path (leading slash, not protocol-relative). */
function safeNextPath(next: string | null, fallback: string): string {
  const raw = (next ?? "").trim() || fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return fallback.startsWith("/") ? fallback : `/${fallback}`;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const supabase = await createClient();

  // PKCE email / OAuth callback: Supabase redirects here with ?code=...
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      const u = userData.user;
      if (u) {
        return sameOriginRedirect(request, userAchievementsPath(u.id));
      }
      const path = safeNextPath(next, "/");
      return sameOriginRedirect(request, path);
    }
    return sameOriginRedirectWithSearch(request, "/auth/error", {
      error: error.message,
    });
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      const u = userData.user;
      if (u) {
        return sameOriginRedirect(request, userAchievementsPath(u.id));
      }
      return sameOriginRedirect(request, safeNextPath(next, "/"));
    }
    return sameOriginRedirectWithSearch(request, "/auth/error", {
      error: error.message,
    });
  }

  return sameOriginRedirectWithSearch(request, "/auth/error", {
    error: "No confirmation code or token",
  });
}
