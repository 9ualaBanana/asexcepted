/**
 * Produce a decode-friendly badge render URL for ImageKit-hosted images.
 * Keeps visual quality high for our <= ~320px on-screen detail badge while
 * reducing bytes/decode cost on mobile devices.
 */
export function toOptimizedBadgeRenderSrc(src: string): string {
  const raw = src.trim();
  if (!raw) return raw;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw;
  }

  const isImageKit = u.hostname.endsWith("imagekit.io");
  if (!isImageKit) return raw;
  if (u.searchParams.has("tr")) return raw;

  // ~2x device-pixel cap for a ~320px render target.
  u.searchParams.set("tr", "w-640,h-640,c-at_max,q-85,f-auto");
  return u.toString();
}

