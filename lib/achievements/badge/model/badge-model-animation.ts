import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AnimationClip } from "three";

import { badgeModelConfig } from "@/lib/achievements/badge/model/badge-model-config";

export function clampBadgeAnimationSpeed(speed: number): number {
  const value = Number.isFinite(speed) ? speed : 1;
  return Math.min(
    badgeModelConfig.animation.maxSpeed,
    Math.max(badgeModelConfig.animation.minSpeed, value),
  );
}

export function pickPrimaryAnimationClip(gltf: GLTF): AnimationClip | null {
  return gltf.animations[0] ?? null;
}

export function scheduleBadgeVisualReady(args: {
  hasCache: boolean;
  onReady: () => void;
  onAllowAdvance: () => void;
}): () => void {
  const { hasCache, onReady, onAllowAdvance } = args;

  if (hasCache) {
    onAllowAdvance();
    onReady();
    return () => undefined;
  }

  let timeoutId: number | undefined;
  const rafId1 = requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      onReady();
      timeoutId = window.setTimeout(() => {
        onAllowAdvance();
      }, badgeModelConfig.animation.visualReadyDelayMs);
    });
  });

  return () => {
    cancelAnimationFrame(rafId1);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };
}
