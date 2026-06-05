"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { AnimationMixer } from "three";

import { badgeModelViewStateStore } from "@/lib/achievements/badge/model/view-state";

export type UseBadgeMixerPersistenceArgs = {
  mixer: AnimationMixer | null;
  viewStateKey: string;
  persistViewState: (mixerTime: number) => void;
  invalidate: () => void;
};

export function useBadgeMixerPersistence({
  mixer,
  viewStateKey,
  persistViewState,
  invalidate,
}: UseBadgeMixerPersistenceArgs) {
  const glCanvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistViewState(mixer?.time ?? 0);
        return;
      }
      const restored = badgeModelViewStateStore.read(viewStateKey);
      if (restored && mixer) {
        mixer.setTime(restored.mixerTime);
      }
      invalidate();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [invalidate, mixer, persistViewState, viewStateKey]);

  useEffect(() => {
    const onContextLost = (event: Event) => {
      event.preventDefault();
      persistViewState(mixer?.time ?? 0);
    };
    const onContextRestored = () => {
      const restored = badgeModelViewStateStore.read(viewStateKey);
      if (restored && mixer) {
        mixer.setTime(restored.mixerTime);
      }
      invalidate();
    };

    glCanvas.addEventListener("webglcontextlost", onContextLost);
    glCanvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      glCanvas.removeEventListener("webglcontextlost", onContextLost);
      glCanvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, [glCanvas, invalidate, mixer, persistViewState, viewStateKey]);
}
