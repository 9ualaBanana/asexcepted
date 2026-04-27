"use client";

import { useEffect, useMemo, useRef } from "react";

import { getAlphaMaskStyle } from "@/components/achievements/badge-shape-utils";
import { cn } from "@/lib/utils";

type AchievementBadge3DViewerProps = {
  src: string;
  className?: string;
  interactive?: boolean;
};

const MODEL_DEPTH_LAYERS = 7;
const MODEL_LAYER_STEP_PX = 1.02;
const MAX_PITCH_DEG = 86;
const DRAG_YAW_SENSITIVITY = 0.28;
const DRAG_PITCH_SENSITIVITY = 0.22;
const INERTIA_DAMPING = 0.94;
const INERTIA_MIN_SPEED = 0.015;

export function AchievementBadge3DViewer({
  src,
  className,
  interactive = true,
}: AchievementBadge3DViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const inertiaRafRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number | null;
    lastX: number;
    lastY: number;
    isDragging: boolean;
  }>({ pointerId: null, lastX: 0, lastY: 0, isDragging: false });
  const anglesRef = useRef({ pitch: 0, yaw: 0 });
  const velocityRef = useRef({ pitch: 0, yaw: 0 });

  const safeSrc = useMemo(() => src.replace(/"/g, '\\"'), [src]);
  const maskStyle = useMemo(() => getAlphaMaskStyle(src), [src]);
  const sideLayerStyle = useMemo(
    () =>
      Array.from({ length: MODEL_DEPTH_LAYERS }).map((_, i) => {
        const z = -(MODEL_DEPTH_LAYERS - i) * MODEL_LAYER_STEP_PX;
        return {
          transform: `translateZ(${z.toFixed(2)}px) translateY(${(Math.abs(z) * 0.16).toFixed(2)}px)`,
          opacity: 0.72 - (MODEL_DEPTH_LAYERS - i) * 0.02,
        };
      }),
    [],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (inertiaRafRef.current !== null) cancelAnimationFrame(inertiaRafRef.current);
    };
  }, []);

  function flushTransform() {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const model = modelRef.current;
      if (!model) return;
      const { pitch, yaw } = anglesRef.current;
      model.style.transform = `rotateX(${pitch.toFixed(3)}deg) rotateY(${yaw.toFixed(3)}deg)`;
    });
  }

  function beginDrag(pointerId: number, clientX: number, clientY: number) {
    if (inertiaRafRef.current !== null) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
    dragRef.current.pointerId = pointerId;
    dragRef.current.lastX = clientX;
    dragRef.current.lastY = clientY;
    dragRef.current.isDragging = true;
    velocityRef.current.pitch = 0;
    velocityRef.current.yaw = 0;
  }

  function updateDrag(clientX: number, clientY: number) {
    const d = dragRef.current;
    if (!d.isDragging) return;
    const dx = clientX - d.lastX;
    const dy = clientY - d.lastY;
    d.lastX = clientX;
    d.lastY = clientY;

    const nextYaw = anglesRef.current.yaw + dx * DRAG_YAW_SENSITIVITY;
    const nextPitch = anglesRef.current.pitch - dy * DRAG_PITCH_SENSITIVITY;
    velocityRef.current.yaw = dx * DRAG_YAW_SENSITIVITY;
    velocityRef.current.pitch = -dy * DRAG_PITCH_SENSITIVITY;

    anglesRef.current.yaw = ((nextYaw % 360) + 360) % 360;
    anglesRef.current.pitch = Math.max(-MAX_PITCH_DEG, Math.min(MAX_PITCH_DEG, nextPitch));
    flushTransform();
  }

  function startInertia() {
    if (inertiaRafRef.current !== null) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
    const tick = () => {
      if (dragRef.current.isDragging) {
        inertiaRafRef.current = null;
        return;
      }
      velocityRef.current.yaw *= INERTIA_DAMPING;
      velocityRef.current.pitch *= INERTIA_DAMPING;

      const speed = Math.abs(velocityRef.current.yaw) + Math.abs(velocityRef.current.pitch);
      if (speed < INERTIA_MIN_SPEED) {
        velocityRef.current.yaw = 0;
        velocityRef.current.pitch = 0;
        inertiaRafRef.current = null;
        return;
      }

      const nextYaw = anglesRef.current.yaw + velocityRef.current.yaw;
      const nextPitch = anglesRef.current.pitch + velocityRef.current.pitch;
      anglesRef.current.yaw = ((nextYaw % 360) + 360) % 360;
      anglesRef.current.pitch = Math.max(-MAX_PITCH_DEG, Math.min(MAX_PITCH_DEG, nextPitch));
      flushTransform();
      inertiaRafRef.current = requestAnimationFrame(tick);
    };
    inertiaRafRef.current = requestAnimationFrame(tick);
  }

  function endDrag() {
    dragRef.current.pointerId = null;
    dragRef.current.isDragging = false;
    startInertia();
  }


  return (
    <div
      ref={rootRef}
      className={cn(
        "relative h-full w-full [perspective:880px]",
        interactive && "touch-none",
        className,
      )}
      onPointerMove={
        interactive
          ? (e) => {
              if (dragRef.current.pointerId !== e.pointerId) return;
              updateDrag(e.clientX, e.clientY);
            }
          : undefined
      }
      onPointerDown={
        interactive
          ? (e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              beginDrag(e.pointerId, e.clientX, e.clientY);
            }
          : undefined
      }
      onPointerUp={
        interactive
          ? (e) => {
              if (dragRef.current.pointerId !== e.pointerId) return;
              endDrag();
            }
          : undefined
      }
      onPointerCancel={
        interactive
          ? (e) => {
              if (dragRef.current.pointerId !== e.pointerId) return;
              endDrag();
            }
          : undefined
      }
    >
      <div
        ref={modelRef}
        className={cn(
          "relative h-full w-full [transform-style:preserve-3d]",
          "will-change-transform",
        )}
        style={{ transform: "rotateX(0deg) rotateY(0deg)" }}
      >
        {sideLayerStyle.map((layer, i) => {
          return (
            <div
              key={i}
              aria-hidden
              className="absolute inset-0"
              style={{
                ...maskStyle,
                transform: layer.transform,
                backgroundImage: `url("${safeSrc}"), linear-gradient(165deg, rgba(255,255,255,0.12) 0%, rgba(28,28,40,0.74) 62%, rgba(8,8,14,0.92) 100%)`,
                backgroundSize: "cover, cover",
                backgroundPosition: "center, center",
                backgroundRepeat: "no-repeat, no-repeat",
                backgroundBlendMode: "multiply, normal",
                boxShadow: "inset 0 0 14px rgba(0,0,0,0.28)",
                opacity: layer.opacity,
                filter: "saturate(0.74) blur(0.2px)",
              }}
            />
          );
        })}

        {/* Top face keeps original badge texture + alpha silhouette. */}
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
          style={{
            ...maskStyle,
            transform: "translateZ(0.9px)",
            backgroundImage: `url("${safeSrc}")`,
          }}
        />
      </div>
    </div>
  );
}
