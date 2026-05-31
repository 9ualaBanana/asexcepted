import "server-only";

import { isPublicHttpImageUrl } from "@/lib/achievements/badge/badge-assets";

const OG_IMAGE_FETCH_TIMEOUT_MS = 8_000;

export function resolveInviteOgBadgeImageUrl(invite: {
  icon_url: string | null;
}): string | null {
  const iconUrl = invite.icon_url?.trim() ?? "";
  return isPublicHttpImageUrl(iconUrl) ? iconUrl : null;
}

export async function fetchInviteOgBadgeImageDataUrl(
  imageUrl: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OG_IMAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      cache: "force-cache",
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
    if (contentType && !contentType.startsWith("image/")) {
      return null;
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > 6 * 1024 * 1024) {
      return null;
    }

    const mime = contentType ?? "image/png";
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
