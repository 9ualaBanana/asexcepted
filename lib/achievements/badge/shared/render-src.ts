/**
 * Shared ImageKit delivery transform for on-screen badges and avatars.
 * Caps decode size at 640px per edge, never upscales (at_max), q-85.
 */
const IMAGEKIT_OPTIMIZED_RENDER_TRANSFORM =
  "w-640,h-640,c-at_max,q-85,f-auto";

/**
 * Produce a decode-friendly badge render URL for ImageKit-hosted images.
 * Caller must pass a non-empty, already-normalized HTTP(S) URL.
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
