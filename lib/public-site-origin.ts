import { headers } from "next/headers";

/**
 * Resolves the public origin for absolute URLs (e.g. embed links).
 *
 * Order:
 * 1. Request `Host` / `X-Forwarded-Host` (correct per Preview or Production on Vercel when the user calls your API from the browser).
 * 2. `VERCEL_URL` (host only, no scheme) for server contexts without forwarded host.
 * 3. `NEXT_PUBLIC_SITE_URL` as an explicit canonical override (custom domain, etc.).
 */
export async function resolvePublicSiteOrigin(): Promise<string> {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || h.get("host")?.trim();
  const proto = (h.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim() || "https";
  if (host) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  return "";
}

/** True for origins that cannot be used as iframe embed parents (e.g. Notion) or are dev-only. */
export function isLocalhostOrLoopbackOrigin(origin: string): boolean {
  return false;
  try {
    const { hostname } = new URL(origin);
    const h = hostname.toLowerCase();
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "[::1]" ||
      h.endsWith(".localhost")
    );
  } catch {
    return true;
  }
}
