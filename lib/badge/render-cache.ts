"use client";

import { LRUCache } from "lru-cache";
import type { CSSProperties } from "react";

import { logCdnDeliveryOnce } from "@/lib/imagekit/telemetry";
import { makeBadgeMotionStyle } from "@/lib/badge/motion";
import { decodeImageReadyPromise } from "@/lib/badge/image-decode";
import {
  getAlphaMaskStyle,
  loadAlphaMaskDataFromImage,
  type AlphaMaskData,
} from "@/lib/badge/shape-utils";

const decodeReady = new LRUCache<string, Promise<void>>({
  max: 300,
  memoMethod: (_key, _value, { context }) => {
    const src = context as string;
    return decodeImageReadyPromise(src).then(() => {
      logCdnDeliveryOnce(src, "decode");
    });
  },
});
const alphaMaskReady = new LRUCache<string, Promise<AlphaMaskData | null>>({
  max: 300,
});
const maskStyleCache = new LRUCache<string, CSSProperties>({
  max: 300,
  memoMethod: getAlphaMaskStyle,
});
const motionStyleCache = new LRUCache<string, CSSProperties>({
  max: 500,
  memoMethod: (_key, _value, { context }) => {
    const { seed, startCentered } = context as { seed: string; startCentered: boolean };
    return makeBadgeMotionStyle(seed, startCentered);
  },
});

/**
 * Ensures the image bytes are loaded and `decode()` has settled for this URL.
 * Reuses one promise per URL so repeat opens do not spawn redundant decode work.
 */
export function ensureBadgeImageDecoded(src: string): Promise<void> {
  return decodeReady.memo(src, { context: src });
}

/** True when decode is already in flight or completed for this URL. */
export function hasBadgeDecodeCached(src: string): boolean {
  return decodeReady.has(src);
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
  const cached = alphaMaskReady.get(src);
  if (cached) return cached;

  const promise = loadAlphaMaskDataFromImage(src).then((mask) => {
    if (!mask) {
      alphaMaskReady.delete(src);
    }
    return mask;
  });
  alphaMaskReady.set(src, promise);
  return promise;
}

/** Decode badge pixels first, then build the unlock hit-test mask (safe after auto-claim / fresh URLs). */
export async function ensureBadgeAlphaMaskData(src: string): Promise<AlphaMaskData | null> {
  if (!src.trim()) return null;
  await ensureBadgeImageDecoded(src);
  return getCachedAlphaMaskData(src);
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
    void ensureBadgeAlphaMaskData(src);
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
