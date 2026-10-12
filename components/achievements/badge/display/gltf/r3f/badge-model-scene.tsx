"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Environment } from "@react-three/drei";

import { badgeModelConfig } from "@/lib/achievements/badge/model/badge-model-config";

export function BadgeModelScene() {
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
    if (this.state.failed) return null;
    return this.props.children;
  }
}
