"use client";

import { LRUCache } from "lru-cache";
import type { CSSProperties } from "react";

import { makeBadgeMotionStyle } from "@/components/achievements/badge/badge-float-motion";
import {
  getAlphaMaskStyle,
  loadAlphaMaskDataFromImage,
  type AlphaMaskData,
} from "@/components/achievements/badge/badge-shape-utils";

const decodeReady = new LRUCache<string, Promise<void>>({ max: 300 });
const alphaMaskReady = new LRUCache<string, Promise<AlphaMaskData | null>>({ max: 300 });
const maskStyleCache = new LRUCache<string, CSSProperties>({ max: 300 });
const motionStyleCache = new LRUCache<string, CSSProperties>({ max: 500 });

function normalizeSrc(src: string): string {
  return src.trim();
}

/**
 * Ensures the image bytes are loaded and `decode()` has settled for this URL.
 * Reuses one promise per URL so repeat opens do not spawn redundant decode work.
 */
export function ensureBadgeImageDecoded(src: string): Promise<void> {
  const key = normalizeSrc(src);
  if (!key) return Promise.resolve();
  const cached = decodeReady.get(key);
  if (cached) return cached;

  const p = new Promise<void>((resolve) => {
    const finish = () => resolve();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      void (img.decode?.() ?? Promise.resolve())
        .then(finish)
        .catch(finish);
    };
    img.onerror = finish;
    img.src = key;
    if (img.complete) {
      void (img.decode?.() ?? Promise.resolve())
        .then(finish)
        .catch(finish);
    }
  });
  decodeReady.set(key, p);
  return p;
}

export function getCachedBadgeMaskStyle(src: string): CSSProperties {
  const key = normalizeSrc(src);
  if (!key) return {};
  const cached = maskStyleCache.get(key);
  if (cached) return cached;
  const style = getAlphaMaskStyle(key);
  maskStyleCache.set(key, style);
  return style;
}

export function getCachedBadgeMotionStyle(
  seed: string,
  startCentered = false,
): CSSProperties {
  const key = `${startCentered ? "1" : "0"}:${seed}`;
  const cached = motionStyleCache.get(key);
  if (cached) return cached;
  const style = makeBadgeMotionStyle(seed, startCentered);
  motionStyleCache.set(key, style);
  return style;
}

export function getCachedAlphaMaskData(src: string): Promise<AlphaMaskData | null> {
  const key = normalizeSrc(src);
  if (!key) return Promise.resolve(null);
  const cached = alphaMaskReady.get(key);
  if (cached) return cached;
  const p = loadAlphaMaskDataFromImage(key);
  alphaMaskReady.set(key, p);
  return p;
}

export function prewarmBadgeRenderCache(
  src: string,
  options?: {
    motionSeed?: string;
    startCentered?: boolean;
    includeAlphaMaskData?: boolean;
  },
): void {
  const key = normalizeSrc(src);
  if (!key) return;
  void ensureBadgeImageDecoded(key);
  void getCachedBadgeMaskStyle(key);
  if (options?.includeAlphaMaskData) {
    void getCachedAlphaMaskData(key);
  }
  if (options?.motionSeed) {
    void getCachedBadgeMotionStyle(options.motionSeed, options.startCentered ?? false);
  }
}

export function clearBadgeRenderCacheForSrc(src: string): void {
  const key = normalizeSrc(src);
  if (!key) return;
  decodeReady.delete(key);
  alphaMaskReady.delete(key);
  maskStyleCache.delete(key);
}
