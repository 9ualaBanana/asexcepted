"use client";

import { useAnimations } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimationAction,
  Group,
  LoopRepeat,
  PerspectiveCamera,
} from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { createConfiguredBadgeGltfLoader } from "@/lib/achievements/badge/badge-gltf-loader";
import {
  centerBadgeModelAtOrigin,
  frameCameraForBadgeModel,
} from "@/lib/achievements/badge/badge-model-rendering";
import { badgeModelViewStateCache } from "@/lib/achievements/badge/badge-model-view-state";

import { useBadgeModelInteraction } from "./use-badge-model-interaction";

export type BadgeModelContentProps = {
  signedModelUrl: string;
  viewStateKey: string;
  initialYaw: number;
  initialPitch: number;
  motionStartCentered: boolean;
  playAnimation: boolean;
  animationSpeed: number;
  interactive: boolean;
  allowInertia: boolean;
  onPoseChange?: (yaw: number, pitch: number) => void;
  onHasAnimationChange?: (hasAnimation: boolean) => void;
  onVisualReady?: () => void;
  onLoadError?: () => void;
};

export function BadgeModelContent({
  signedModelUrl,
  viewStateKey,
  initialYaw,
  initialPitch,
  motionStartCentered,
  playAnimation,
  animationSpeed,
  interactive,
  allowInertia,
  onPoseChange,
  onHasAnimationChange,
  onVisualReady,
  onLoadError,
}: BadgeModelContentProps) {
  const orbitRootRef = useRef<Group>(null);
  const modelRootRef = useRef<Group>(null);
  const actionRef = useRef<AnimationAction | null>(null);
  const visualReadyRef = useRef(false);
  const allowAnimationAdvanceRef = useRef(false);
  const playAnimationRef = useRef(playAnimation);
  const animationSpeedRef = useRef(animationSpeed);
  const prevPlayAnimationRef = useRef(playAnimation);

  const [gltf, setGltf] = useState<GLTF | null>(null);

  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera) as PerspectiveCamera;

  playAnimationRef.current = playAnimation;
  animationSpeedRef.current = animationSpeed;

  useEffect(() => {
    let cancelled = false;
    visualReadyRef.current = false;
    allowAnimationAdvanceRef.current = false;
    setGltf(null);

    const { loader, dracoLoader } = createConfiguredBadgeGltfLoader();
    void loader
      .loadAsync(signedModelUrl)
      .then((loaded) => {
        if (cancelled) return;
        setGltf(loaded);
      })
      .catch(() => {
        if (cancelled) return;
        onLoadError?.();
        onHasAnimationChange?.(false);
      })
      .finally(() => {
        dracoLoader.dispose();
      });

    return () => {
      cancelled = true;
    };
  }, [onHasAnimationChange, onLoadError, signedModelUrl]);

  const modelObject = useMemo(() => {
    if (!gltf) return null;
    const model = cloneSkeleton(gltf.scene) as Group;
    centerBadgeModelAtOrigin(model);
    return model;
  }, [gltf]);

  useEffect(() => {
    if (!modelObject || !orbitRootRef.current) return;
    frameCameraForBadgeModel(orbitRootRef.current, camera);
    camera.fov = Number(process.env.NEXT_PUBLIC_BADGE_MODEL_CAMERA_FOV);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, modelObject]);

  const { actions, mixer } = useAnimations(gltf?.animations ?? [], modelRootRef);

  const cachedMixerTime = motionStartCentered
    ? 0
    : (badgeModelViewStateCache.get(viewStateKey)?.mixerTime ?? 0);

  const { persistViewState } = useBadgeModelInteraction({
    orbitRootRef,
    viewStateKey,
    initialYaw,
    initialPitch,
    motionStartCentered,
    interactive,
    allowInertia,
    enabled: Boolean(modelObject),
    onPoseChange,
    onPersistViewState: () => undefined,
  });

  useEffect(() => {
    if (!gltf) return;

    const clip = gltf.animations[0];
    const hasAnimation = Boolean(clip);
    onHasAnimationChange?.(hasAnimation);

    if (!clip || !actions[clip.name]) {
      actionRef.current = null;
      return;
    }

    const action = actions[clip.name]!;
    action.setLoop(LoopRepeat, Infinity);
    action.reset();
    action.play();
    action.paused = !playAnimationRef.current;
    action.setEffectiveTimeScale(
      Math.min(2, Math.max(0.1, animationSpeedRef.current)),
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

    const cached = badgeModelViewStateCache.get(viewStateKey);
    allowAnimationAdvanceRef.current = Boolean(cached) || motionStartCentered;

    if (!visualReadyRef.current) {
      visualReadyRef.current = true;
      if (cached || motionStartCentered) {
        allowAnimationAdvanceRef.current = true;
        onVisualReady?.();
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            onVisualReady?.();
            window.setTimeout(() => {
              allowAnimationAdvanceRef.current = true;
            }, 140);
          });
        });
      }
    }

    return () => {
      action.stop();
    };
  }, [actions, gltf, mixer, motionStartCentered, onHasAnimationChange, onVisualReady, viewStateKey]);

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
      Math.min(2, Math.max(0.1, animationSpeedRef.current)),
    );
    invalidate();
  }, [playAnimation, mixer, invalidate]);

  useEffect(() => {
    const action = actionRef.current;
    if (!action) return;
    action.setEffectiveTimeScale(Math.min(2, Math.max(0.1, animationSpeed)));
    invalidate();
  }, [animationSpeed, invalidate]);

  useFrame((_, delta) => {
    if (document.visibilityState === "hidden") return;
    if (!allowAnimationAdvanceRef.current || !playAnimationRef.current) return;
    const action = actionRef.current;
    if (!action || action.paused) return;
    const speed = Number.isFinite(animationSpeedRef.current)
      ? animationSpeedRef.current
      : 1;
    const clampedSpeed = Math.min(2, Math.max(0.1, speed));
    if (mixer) {
      mixer.update(delta * clampedSpeed);
      persistViewState(mixer.time);
    }
    invalidate();
  });

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistViewState(mixer?.time ?? 0);
        return;
      }
      const restored = badgeModelViewStateCache.get(viewStateKey);
      if (restored && mixer) {
        mixer.setTime(restored.mixerTime);
      }
      invalidate();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [invalidate, mixer, persistViewState, viewStateKey]);

  useEffect(() => {
    const canvas = gl.domElement;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      persistViewState(mixer?.time ?? 0);
    };
    const onContextRestored = () => {
      const restored = badgeModelViewStateCache.get(viewStateKey);
      if (restored && mixer) {
        mixer.setTime(restored.mixerTime);
      }
      invalidate();
    };

    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, [gl.domElement, invalidate, mixer, persistViewState, viewStateKey]);

  if (!modelObject) {
    return null;
  }

  return (
    <group ref={orbitRootRef}>
      <group ref={modelRootRef}>
        <primitive object={modelObject} />
      </group>
    </group>
  );
}
