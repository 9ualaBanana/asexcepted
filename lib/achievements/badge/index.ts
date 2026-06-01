/**
 * Achievement badge library — three concerns:
 * - `shared/` — buckets, paths, CDN render cache, motion
 * - `parallax/` — 2D image badges (mask, shape hit-test, glitter)
 * - `model/` — GLB load, frame, poster pipeline, view state
 */

export * from "./shared";
export * from "./parallax";
export * from "./model";
