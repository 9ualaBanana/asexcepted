"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

import { applyBadgeModelPose } from "@/lib/achievements/badge-model-poses";
import { badgeModelViewStateCache } from "@/lib/achievements/badge-model-view-state";

const MAX_PITCH_RAD = Math.PI / 2.2;
const DRAG_YAW_SENSITIVITY = 0.0072;
const DRAG_PITCH_SENSITIVITY = 0.0054;
const INERTIA_DAMPING = 0.93;
const INERTIA_MIN_SPEED = 0.00035;

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
  onPersistViewState?: (mixerTime: number) => void;
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
  onPersistViewState,
}: UseBadgeModelInteractionArgs) {
  const invalidate = useThree((state) => state.invalidate);
  const glDomElement = useThree((state) => state.gl.domElement);

  const cachedState = motionStartCentered
    ? undefined
    : badgeModelViewStateCache.get(viewStateKey);

  const yawRef = useRef(motionStartCentered ? initialYaw : (cachedState?.yaw ?? initialYaw));
  const pitchRef = useRef(
    motionStartCentered ? initialPitch : (cachedState?.pitch ?? initialPitch),
  );
  const inertiaYawRef = useRef(cachedState?.inertiaYaw ?? 0);
  const inertiaPitchRef = useRef(cachedState?.inertiaPitch ?? 0);
  const dragPointerIdRef = useRef<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const persistViewState = (mixerTime: number) => {
    badgeModelViewStateCache.set(viewStateKey, {
      yaw: yawRef.current,
      pitch: pitchRef.current,
      inertiaYaw: inertiaYawRef.current,
      inertiaPitch: inertiaPitchRef.current,
      mixerTime,
    });
    onPersistViewState?.(mixerTime);
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
      : badgeModelViewStateCache.get(viewStateKey);
    if (cached) {
      yawRef.current = cached.yaw;
      pitchRef.current = cached.pitch;
      inertiaYawRef.current = cached.inertiaYaw;
      inertiaPitchRef.current = cached.inertiaPitch;
    }
    applyRotation();
  }, [enabled, viewStateKey, motionStartCentered]);

  useEffect(() => {
    if (!interactive) return;

    const element = glDomElement;

    const beginDrag = (pointerId: number, clientX: number, clientY: number) => {
      dragPointerIdRef.current = pointerId;
      lastPointerRef.current = { x: clientX, y: clientY };
      inertiaYawRef.current = 0;
      inertiaPitchRef.current = 0;
    };

    const updateDrag = (clientX: number, clientY: number) => {
      if (dragPointerIdRef.current == null) return;
      const dx = clientX - lastPointerRef.current.x;
      const dy = clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: clientX, y: clientY };
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
    };

    const endDrag = () => {
      dragPointerIdRef.current = null;
      if (!allowInertia) {
        inertiaYawRef.current = 0;
        inertiaPitchRef.current = 0;
      }
      onPoseChange?.(yawRef.current, pitchRef.current);
    };

    const onPointerDown = (event: PointerEvent) => {
      element.setPointerCapture(event.pointerId);
      beginDrag(event.pointerId, event.clientX, event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      updateDrag(event.clientX, event.clientY);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) return;
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      endDrag();
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);
    element.addEventListener("pointerleave", onPointerUp);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("pointerleave", onPointerUp);
    };
  }, [
    allowInertia,
    glDomElement,
    interactive,
    onPoseChange,
    orbitRootRef,
  ]);

  useFrame((_, delta) => {
    if (
      allowInertia &&
      dragPointerIdRef.current == null &&
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
