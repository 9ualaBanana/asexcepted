"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Environment } from "@react-three/drei";

import { badgeModelConfig } from "@/lib/achievements/badge/model/badge-model-config";
import { isIosDevice } from "@/lib/achievements/badge/model/ios-webgl";

export function BadgeModelScene() {
  if (isIosDevice()) {
    return <BadgeModelPlainLights />;
  }

  return (
    <BadgeModelLightingBoundary>
      <Suspense fallback={<BadgeModelPlainLights />}>
        <Environment
          preset="studio"
          environmentIntensity={badgeModelConfig.environment.intensity}
        />
      </Suspense>
    </BadgeModelLightingBoundary>
  );
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
