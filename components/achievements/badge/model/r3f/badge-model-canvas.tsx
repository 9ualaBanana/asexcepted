"use client";

import { Canvas } from "@react-three/fiber";
import { useCallback } from "react";

import { configureBadgeModelRenderer } from "@/lib/achievements/badge/badge-model-viewer-pipeline";

import { BadgeModelScene } from "./badge-model-scene";
import { BadgeModelContent, type BadgeModelContentProps } from "./badge-model-content";

export type BadgeModelCanvasProps = BadgeModelContentProps & {
  className?: string;
  onInvalidateReady?: (invalidate: () => void) => void;
};

export function BadgeModelCanvas({
  className,
  onInvalidateReady,
  playAnimation = true,
  ...contentProps
}: BadgeModelCanvasProps) {
  const handleCreated = useCallback(
    ({
      gl,
      invalidate,
    }: {
      gl: import("three").WebGLRenderer;
      invalidate: () => void;
    }) => {
      configureBadgeModelRenderer(gl);
      gl.setClearColor(0x000000, 0);
      onInvalidateReady?.(invalidate);
    },
    [onInvalidateReady],
  );

  const frameloop = playAnimation ? "always" : "demand";

  return (
    <Canvas
      className={className}
      frameloop={frameloop}
      dpr={[1, 2]}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      camera={{ fov: 34, near: 0.01, far: 1000, position: [0, 0, 5] }}
      onCreated={handleCreated}
      style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
    >
      <BadgeModelScene />
      <BadgeModelContent playAnimation={playAnimation} {...contentProps} />
    </Canvas>
  );
}
