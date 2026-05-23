/**
 * Shared ImageKit delivery transform for on-screen badges and avatars.
 * Caps decode size at 640px per edge, never upscales (at_max), q-85.
 */
export const IMAGEKIT_OPTIMIZED_RENDER_TRANSFORM =
  "w-640,h-640,c-at_max,q-85,f-auto";
