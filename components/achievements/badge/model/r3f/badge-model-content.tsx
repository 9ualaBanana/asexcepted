"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAnimations } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Group, PerspectiveCamera } from "three";

import { badgeModelConfig } from "@/lib/achievements/badge/model/badge-model-config";
import { applyBadgeModelGltfTuning } from "@/lib/achievements/badge/model/gltf-tuning";
import { frameCameraForBadgeModel } from "@/lib/achievements/badge/model/rendering";
import { prepareBadgeGltfRoot } from "@/lib/achievements/badge/model/scene-graph";

import { useBadgeGltfSource } from "../hooks/use-badge-gltf-source";
import { useBadgeModelAnimation } from "./use-badge-model-animation";
import { useBadgeMixerPersistence } from "./use-badge-mixer-persistence";
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

  const { gltf, error } = useBadgeGltfSource(signedModelUrl);

  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera) as PerspectiveCamera;

  useEffect(() => {
    if (!error) return;
    onLoadError?.();
    onHasAnimationChange?.(false);
  }, [error, onHasAnimationChange, onLoadError]);

  const modelObject = useMemo(() => {
    if (!gltf) return null;
    return prepareBadgeGltfRoot(gltf);
  }, [gltf]);

  useEffect(() => {
    if (!gltf || !modelObject) return;
    applyBadgeModelGltfTuning(gltf, modelObject, { scene, renderer: gl });
    invalidate();
  }, [gltf, gl, invalidate, modelObject, scene]);

  useEffect(() => {
    if (!modelObject || !orbitRootRef.current) return;
    frameCameraForBadgeModel(orbitRootRef.current, camera);
    camera.fov = badgeModelConfig.camera.fov;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, modelObject]);

  const { actions, mixer } = useAnimations(gltf?.animations ?? [], modelRootRef);

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
  });

  useBadgeModelAnimation({
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
  });

  useBadgeMixerPersistence({
    mixer,
    viewStateKey,
    persistViewState,
    invalidate,
  });

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
