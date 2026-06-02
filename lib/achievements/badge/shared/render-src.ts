import { trimBadgeIconUrl } from "@/lib/achievements/badge/shared/badge-assets";

/**
 * Shared ImageKit delivery transform for on-screen badges and avatars.
 * Caps decode size at 640px per edge, never upscales (at_max), q-85.
 */
const IMAGEKIT_OPTIMIZED_RENDER_TRANSFORM =
  "w-640,h-640,c-at_max,q-85,f-auto";

/**
 * Produce a decode-friendly badge render URL for ImageKit-hosted images.
 * Keeps visual quality high for our <= ~320px on-screen detail badge while
 * reducing bytes/decode cost on mobile devices.
 */
export function toOptimizedRenderSrc(src: string): string {
  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return src;
  }

  const isImageKit = u.hostname.endsWith("imagekit.io");
  if (!isImageKit) return src;
  if (u.searchParams.has("tr")) return src;

  u.searchParams.set("tr", IMAGEKIT_OPTIMIZED_RENDER_TRANSFORM);
  return u.toString();
}

/** Optimized 2D badge URL for parallax / poster overlays (empty when no `icon_url`). */
export function badgeRenderSrcFromIconUrl(
  iconUrl: string | null | undefined,
): string {
  return toOptimizedRenderSrc(trimBadgeIconUrl(iconUrl));
}

/** Same as `badgeRenderSrcFromIconUrl`, but `null` when the icon URL is missing. */
export function badgeDisplaySrcFromIconUrl(
  iconUrl: string | null | undefined,
): string | null {
  const trimmed = trimBadgeIconUrl(iconUrl);
  return trimmed ? toOptimizedRenderSrc(trimmed) : null;
}

