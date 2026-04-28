"use client";

import type { CSSProperties } from "react";

import { makeBadgeMotionStyle } from "@/components/achievements/badge-float-motion";
import {
  getAlphaMaskStyle,
  loadAlphaMaskDataFromImage,
  type AlphaMaskData,
} from "@/components/achievements/badge-shape-utils";

const imageReady = new Map<string, Promise<void>>();
const alphaMaskReady = new Map<string, Promise<AlphaMaskData | null>>();
const maskStyleCache = new Map<string, CSSProperties>();
const motionStyleCache = new Map<string, CSSProperties>();

function normalizeSrc(src: string): string {
  return src.trim();
}

function imagePreload(src: string): Promise<void> {
  const key = normalizeSrc(src);
  if (!key) return Promise.resolve();
  const cached = imageReady.get(key);
  if (cached) return cached;

  const p = new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = key;
    if (img.complete) {
      void img.decode?.().catch(() => undefined).finally(resolve);
    }
  });
  imageReady.set(key, p);
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
  options?: { motionSeed?: string; startCentered?: boolean },
): void {
  const key = normalizeSrc(src);
  if (!key) return;
  void imagePreload(key);
  void getCachedAlphaMaskData(key);
  void getCachedBadgeMaskStyle(key);
  if (options?.motionSeed) {
    void getCachedBadgeMotionStyle(options.motionSeed, options.startCentered ?? false);
  }
}

export function clearBadgeRenderCacheForSrc(src: string): void {
  const key = normalizeSrc(src);
  if (!key) return;
  imageReady.delete(key);
  alphaMaskReady.delete(key);
  maskStyleCache.delete(key);
}

