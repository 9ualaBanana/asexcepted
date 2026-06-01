"use client";

import { Environment } from "@react-three/drei";

export function BadgeModelScene() {
  return (
    <Environment
      preset="studio"
      environmentIntensity={Number(
        process.env.NEXT_PUBLIC_BADGE_MODEL_ENVIRONMENT_INTENSITY,
      )}
    />
  );
}
