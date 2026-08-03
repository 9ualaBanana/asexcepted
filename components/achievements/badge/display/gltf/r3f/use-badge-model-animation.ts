"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { LoopRepeat, type AnimationAction, type AnimationMixer } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  clampBadgeAnimationSpeed,
  pickPrimaryAnimationClip,
  scheduleBadgeVisualReady,
} from "@/lib/achievements/badge/model/badge-model-animation";
import { badgeModelViewStateStore } from "@/lib/achievements/badge/model/view-state";

export type UseBadgeModelAnimationArgs = {
  gltf: GLTF | null;
  mixer: AnimationMixer | null;
  actions: Record<string, AnimationAction | null>;
  playAnimation: boolean;
  animationSpeed: number;
  viewStateKey: string;
  motionStartCentered: boolean;
  onVisualReady?: () => void;
  onHasAnimationChange?: (hasAnimation: boolean) => void;
  persistViewState: (mixerTime: number) => void;
};

export function useBadgeModelAnimation({
  gltf,
  mixer,
  actions,
  playAnimation,
  animationSpeed,
  viewStateKey,
  motionStartCentered,
  onVisualReady,
  onHasAnimationChange,
  persistViewState,
}: UseBadgeModelAnimationArgs) {
  const invalidate = useThree((state) => state.invalidate);
  const actionRef = useRef<AnimationAction | null>(null);
  const visualReadyRef = useRef(false);
  const allowAnimationAdvanceRef = useRef(false);
  const playAnimationRef = useRef(playAnimation);
  const animationSpeedRef = useRef(animationSpeed);
  const prevPlayAnimationRef = useRef(playAnimation);

  playAnimationRef.current = playAnimation;
  animationSpeedRef.current = animationSpeed;

  const notifyVisualReady = useEffectEvent(() => onVisualReady?.());
  const notifyHasAnimationChange = useEffectEvent((hasAnimation: boolean) =>
    onHasAnimationChange?.(hasAnimation),
  );

  useEffect(() => {
    visualReadyRef.current = false;
    allowAnimationAdvanceRef.current = false;
  }, [gltf, viewStateKey]);

  const cachedMixerTime = motionStartCentered
    ? 0
    : badgeModelViewStateStore.readMixerTime(viewStateKey);

  useEffect(() => {
    if (!gltf) return;

    const clip = pickPrimaryAnimationClip(gltf);
    const hasAnimation = Boolean(clip);
    notifyHasAnimationChange(hasAnimation);

    let cancelVisualReady: (() => void) | undefined;
    let readyScheduled = false;

    const ensureVisualReady = () => {
      if (visualReadyRef.current || readyScheduled) return;
      readyScheduled = true;
      const cached = badgeModelViewStateStore.read(viewStateKey);
      allowAnimationAdvanceRef.current =
        Boolean(cached) || motionStartCentered;
      cancelVisualReady = scheduleBadgeVisualReady({
        hasCache: Boolean(cached) || motionStartCentered,
        onReady: () => {
          visualReadyRef.current = true;
          notifyVisualReady();
        },
        onAllowAdvance: () => {
          allowAnimationAdvanceRef.current = true;
        },
      });
    };

    if (clip && !actions[clip.name]) {
      return;
    }

    if (!clip) {
      actionRef.current = null;
      ensureVisualReady();
      return () => {
        cancelVisualReady?.();
      };
    }

    const action = actions[clip.name]!;
    action.setLoop(LoopRepeat, Infinity);
    action.reset();
    action.play();
    action.paused = !playAnimationRef.current;
    action.setEffectiveTimeScale(
      clampBadgeAnimationSpeed(animationSpeedRef.current),
    );
    if (mixer) {
      mixer.setTime(cachedMixerTime);
    }
    if (!playAnimationRef.current) {
      action.paused = true;
      action.stop();
      action.reset();
      mixer?.setTime(0);
    }
    actionRef.current = action;
    ensureVisualReady();

    return () => {
      cancelVisualReady?.();
      action.stop();
    };
  }, [
    actions,
    cachedMixerTime,
    gltf,
    mixer,
    motionStartCentered,
    notifyHasAnimationChange,
    notifyVisualReady,
    viewStateKey,
  ]);

  useEffect(() => {
    const action = actionRef.current;
    if (!action) return;

    const wasPlaying = prevPlayAnimationRef.current;
    prevPlayAnimationRef.current = playAnimation;

    if (playAnimation === wasPlaying) {
      return;
    }

    if (!playAnimation) {
      action.paused = true;
      action.stop();
      action.reset();
      if (mixer) {
        mixer.setTime(0);
      }
      invalidate();
      return;
    }

    action.reset();
    action.play();
    action.paused = false;
    if (mixer) {
      mixer.setTime(0);
    }
    action.setEffectiveTimeScale(
      clampBadgeAnimationSpeed(animationSpeedRef.current),
    );
    invalidate();
  }, [invalidate, mixer, playAnimation]);

  useEffect(() => {
    const action = actionRef.current;
    if (!action) return;
    action.setEffectiveTimeScale(clampBadgeAnimationSpeed(animationSpeed));
    invalidate();
  }, [animationSpeed, invalidate]);

  useFrame((_, delta) => {
    if (document.visibilityState === "hidden") return;
    if (!allowAnimationAdvanceRef.current || !playAnimationRef.current) return;
    const action = actionRef.current;
    if (!action || action.paused) return;
    const clampedSpeed = clampBadgeAnimationSpeed(animationSpeedRef.current);
    if (mixer) {
      mixer.update(delta * clampedSpeed);
      persistViewState(mixer.time);
    }
    invalidate();
  });

  return { actionRef };
}
