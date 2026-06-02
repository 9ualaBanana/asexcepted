"use client";

import { Environment } from "@react-three/drei";
import { badgeModelConfig } from "@/lib/achievements/badge/model/badge-model-config";

/**
 * Live viewer IBL via Drei. Poster snapshots cannot use React/Drei — they load the
 * same studio HDR manually in `studio-environment.ts`. Both paths read intensity
 * from `badgeModelConfig.environment` for parity.
 */

export function BadgeModelScene() {
  return (
    <Environment
      preset="studio"
      environmentIntensity={badgeModelConfig.environment.intensity}
    />
  );
}
