"use client";

import { LRUCache } from "lru-cache";
import type { CSSProperties } from "react";

import { makeBadgeMotionStyle } from "@/lib/badge/motion";
import { decodeImageReadyPromise } from "@/lib/badge/image-decode";
import {
  getAlphaMaskStyle,
  loadAlphaMaskDataFromImage,
  type AlphaMaskData,
} from "@/lib/badge/shape-utils";

const decodeReady = new LRUCache<string, Promise<void>>({
  max: 300,
  memoMethod: decodeImageReadyPromise,
 });
const alphaMaskReady = new LRUCache<string, Promise<AlphaMaskData | null>>({
  max: 300,
  memoMethod: loadAlphaMaskDataFromImage
});
const maskStyleCache = new LRUCache<string, CSSProperties>({
  max: 300,
  memoMethod: getAlphaMaskStyle
});
const motionStyleCache = new LRUCache<string, CSSProperties>({
  max: 500,
  memoMethod: (_key, _value, { context }) =>{
    const { seed, startCentered } = context as { seed: string; startCentered: boolean };
    return makeBadgeMotionStyle(seed, startCentered);
  }
});

/**
 * Ensures the image bytes are loaded and `decode()` has settled for this URL.
 * Reuses one promise per URL so repeat opens do not spawn redundant decode work.
 */
export function ensureBadgeImageDecoded(src: string): Promise<void> {
  return decodeReady.memo(src);
}

export function getCachedBadgeMaskStyle(src: string): CSSProperties {
  return maskStyleCache.memo(src);
}

export function getCachedBadgeMotionStyle(
  seed: string,
  startCentered = false,
): CSSProperties {
  const key = `${startCentered ? "1" : "0"}:${seed}`;
  return motionStyleCache.memo(key, { context: { seed, startCentered } });
}

export function getCachedAlphaMaskData(src: string): Promise<AlphaMaskData | null> {
  return alphaMaskReady.memo(src);
}

export function prewarmBadgeRenderCache(
  src: string,
  options?: {
    motionSeed?: string;
    startCentered?: boolean;
    includeAlphaMaskData?: boolean;
  },
): void {
  void ensureBadgeImageDecoded(src);
  void getCachedBadgeMaskStyle(src);
  if (options?.includeAlphaMaskData) {
    void getCachedAlphaMaskData(src);
  }
  if (options?.motionSeed) {
    void getCachedBadgeMotionStyle(options.motionSeed, options.startCentered);
  }
}

export function clearBadgeRenderCacheForSrc(src: string): void {
  decodeReady.delete(src);
  alphaMaskReady.delete(src);
  maskStyleCache.delete(src);
}
