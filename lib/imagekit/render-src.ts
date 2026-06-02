/**
 * Shared ImageKit delivery transform for on-screen images (badges, avatars).
 * Caps decode size at 640px per edge, never upscales (at_max), q-85.
 */
const IMAGEKIT_OPTIMIZED_RENDER_TRANSFORM =
  "w-640,h-640,c-at_max,q-85,f-auto";

/** Trim + ImageKit optimize; `null` when the URL is absent. */
export function toOptimizedRenderUrl(
  iconUrl: string | null | undefined,
): string | null {
  const trimmed = iconUrl?.trim() ?? "";
  if (!trimmed) return null;
  return applyImageKitRenderTransform(trimmed);
}

function applyImageKitRenderTransform(src: string): string {
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
