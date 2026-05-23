const AVATAR_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

/** Base name for ImageKit (`useUniqueFileName` adds the unique suffix). */
export function imageKitAvatarUploadFileName(originalName?: string): string {
  const ext = originalName?.match(AVATAR_EXT)?.[0]?.toLowerCase() ?? "";
  return ext ? `avatar${ext}` : "avatar";
}
