import { IMAGEKIT_OPTIMIZED_RENDER_TRANSFORM } from "@/lib/imagekit/render-transform";

/**
 * Produce a decode-friendly badge render URL for ImageKit-hosted images.
 * Keeps visual quality high for our <= ~320px on-screen detail badge while
 * reducing bytes/decode cost on mobile devices.
 */
export function toOptimizedBadgeRenderSrc(src: string): string {
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

