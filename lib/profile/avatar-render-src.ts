import { IMAGEKIT_OPTIMIZED_RENDER_TRANSFORM } from "@/lib/imagekit/render-transform";

export function toOptimizedAvatarRenderSrc(src: string): string {
  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return src;
  }

  if (!u.hostname.endsWith("imagekit.io")) return src;
  if (u.searchParams.has("tr")) return src;

  u.searchParams.set("tr", IMAGEKIT_OPTIMIZED_RENDER_TRANSFORM);
  return u.toString();
}
