"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useDrag } from "@use-gesture/react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

import { badgeModelConfig } from "@/lib/achievements/badge/model/badge-model-config";
import { applyBadgeModelPose } from "@/lib/achievements/badge/model/scene-graph";
import { badgeModelViewStateStore } from "@/lib/achievements/badge/model/view-state";

const {
  maxPitchRad: MAX_PITCH_RAD,
  dragYawSensitivity: DRAG_YAW_SENSITIVITY,
  dragPitchSensitivity: DRAG_PITCH_SENSITIVITY,
  inertiaDamping: INERTIA_DAMPING,
  inertiaMinSpeed: INERTIA_MIN_SPEED,
} = badgeModelConfig.interaction;

export type UseBadgeModelInteractionArgs = {
  orbitRootRef: RefObject<Group | null>;
  viewStateKey: string;
  initialYaw: number;
  initialPitch: number;
  motionStartCentered: boolean;
  interactive: boolean;
  allowInertia: boolean;
  /** When false, orbit root is not mounted yet. */
  enabled?: boolean;
  onPoseChange?: (yaw: number, pitch: number) => void;
};

export function useBadgeModelInteraction({
  orbitRootRef,
  viewStateKey,
  initialYaw,
  initialPitch,
  motionStartCentered,
  interactive,
  allowInertia,
  enabled = true,
  onPoseChange,
}: UseBadgeModelInteractionArgs) {
  const invalidate = useThree((state) => state.invalidate);
  const glDomElement = useThree((state) => state.gl.domElement);

  const cachedState = motionStartCentered
    ? undefined
    : badgeModelViewStateStore.read(viewStateKey);

  const yawRef = useRef(motionStartCentered ? initialYaw : (cachedState?.yaw ?? initialYaw));
  const pitchRef = useRef(
    motionStartCentered ? initialPitch : (cachedState?.pitch ?? initialPitch),
  );
  const inertiaYawRef = useRef(cachedState?.inertiaYaw ?? 0);
  const inertiaPitchRef = useRef(cachedState?.inertiaPitch ?? 0);
  const draggingRef = useRef(false);
  const onPoseChangeRef = useRef(onPoseChange);
  onPoseChangeRef.current = onPoseChange;

  const persistViewState = (mixerTime: number) => {
    badgeModelViewStateStore.write(viewStateKey, {
      yaw: yawRef.current,
      pitch: pitchRef.current,
      inertiaYaw: inertiaYawRef.current,
      inertiaPitch: inertiaPitchRef.current,
      mixerTime,
    });
  };

  const applyRotation = () => {
    const root = orbitRootRef.current;
    if (!root) return;
    applyBadgeModelPose(root, yawRef.current, pitchRef.current);
    invalidate();
  };

  useEffect(() => {
    if (!enabled) return;
    const cached = motionStartCentered
      ? undefined
      : badgeModelViewStateStore.read(viewStateKey);
    if (cached) {
      yawRef.current = cached.yaw;
      pitchRef.current = cached.pitch;
      inertiaYawRef.current = cached.inertiaYaw;
      inertiaPitchRef.current = cached.inertiaPitch;
    }
    applyRotation();
  }, [enabled, viewStateKey, motionStartCentered]);

  useEffect(() => {
    if (!interactive || !enabled) return;
    const previous = glDomElement.style.touchAction;
    glDomElement.style.touchAction = "none";
    return () => {
      glDomElement.style.touchAction = previous;
    };
  }, [enabled, glDomElement, interactive]);

  useDrag(
    ({ active, first, last, tap, delta: [dx, dy] }) => {
      if (tap) {
        draggingRef.current = false;
        return;
      }

      if (first) {
        inertiaYawRef.current = 0;
        inertiaPitchRef.current = 0;
      }

      draggingRef.current = active;

      if (active) {
        const dragYaw = dx * DRAG_YAW_SENSITIVITY;
        const dragPitch = dy * DRAG_PITCH_SENSITIVITY;
        if (allowInertia) {
          inertiaYawRef.current = dragYaw;
          inertiaPitchRef.current = dragPitch;
        } else {
          inertiaYawRef.current = 0;
          inertiaPitchRef.current = 0;
        }
        yawRef.current += dragYaw;
        pitchRef.current = Math.max(
          -MAX_PITCH_RAD,
          Math.min(MAX_PITCH_RAD, pitchRef.current + dragPitch),
        );
        applyRotation();
      }

      if (last) {
        draggingRef.current = false;
        if (!allowInertia) {
          inertiaYawRef.current = 0;
          inertiaPitchRef.current = 0;
        }
        onPoseChangeRef.current?.(yawRef.current, pitchRef.current);
      }
    },
    {
      target: glDomElement,
      enabled: interactive && enabled,
      filterTaps: true,
      threshold: 6,
      pointer: { capture: true },
    },
  );

  useFrame(() => {
    if (
      allowInertia &&
      !draggingRef.current &&
      orbitRootRef.current &&
      Math.abs(inertiaYawRef.current) + Math.abs(inertiaPitchRef.current) >=
        INERTIA_MIN_SPEED
    ) {
      inertiaYawRef.current *= INERTIA_DAMPING;
      inertiaPitchRef.current *= INERTIA_DAMPING;
      yawRef.current += inertiaYawRef.current;
      pitchRef.current = Math.max(
        -MAX_PITCH_RAD,
        Math.min(MAX_PITCH_RAD, pitchRef.current + inertiaPitchRef.current),
      );
      applyRotation();
    }
  });

  return { persistViewState, yawRef, pitchRef };
}
