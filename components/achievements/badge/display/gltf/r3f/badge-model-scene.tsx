"use client";

import { Component, Suspense, useLayoutEffect, useState, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { badgeModelConfig } from "@/lib/achievements/badge/model/badge-model-config";
import { isIosDevice } from "@/lib/achievements/badge/model/ios-webgl";

export function BadgeModelScene() {
  if (isIosDevice()) {
    return <BadgeModelIosLighting />;
  }

  return (
    <BadgeModelLightingBoundary>
      <Suspense fallback={null}>
        <Environment
          preset="studio"
          environmentIntensity={badgeModelConfig.environment.intensity}
        />
      </Suspense>
    </BadgeModelLightingBoundary>
  );
}

function BadgeModelIosLighting() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const [needsLights, setNeedsLights] = useState(false);

  useLayoutEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    try {
      const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = texture;
      scene.environmentIntensity = badgeModelConfig.environment.intensity;
      return () => {
        texture.dispose();
        pmrem.dispose();
        if (scene.environment === texture) {
          scene.environment = null;
        }
      };
    } catch {
      pmrem.dispose();
      setNeedsLights(true);
    }
  }, [gl, scene]);

  if (!needsLights) return null;
  return <BadgeModelPlainLights />;
}

function BadgeModelPlainLights() {
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[2.2, 3.4, 4]} intensity={1.15} />
    </>
  );
}

type LightingBoundaryProps = {
  children: ReactNode;
};

type LightingBoundaryState = {
  failed: boolean;
};

class BadgeModelLightingBoundary extends Component<
  LightingBoundaryProps,
  LightingBoundaryState
> {
  state: LightingBoundaryState = { failed: false };

  static getDerivedStateFromError(): LightingBoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <BadgeModelPlainLights />;
    return this.props.children;
  }
}
