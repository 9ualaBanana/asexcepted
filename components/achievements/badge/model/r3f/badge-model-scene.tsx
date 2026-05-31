"use client";

import { Environment } from "@react-three/drei";
import { BADGE_MODEL_ENVIRONMENT_INTENSITY } from "@/lib/achievements/badge-model-viewer-pipeline";

export function BadgeModelScene() {
  return (
    <Environment
      preset="studio"
      environmentIntensity={BADGE_MODEL_ENVIRONMENT_INTENSITY}
    />
  );
}
