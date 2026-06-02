"use client";

export type {
  BadgeModelPoseSession,
} from "@/components/achievements/badge/upload/model/badge-model-pose-session";

export {
  revokeBadgeModelPoseSession,
} from "@/components/achievements/badge/upload/model/badge-model-pose-session";

import type { BadgeModelPoseSession as PoseSession } from "@/components/achievements/badge/upload/model/badge-model-pose-session";

/** In-progress GLB pose before poster finalize — not a remote asset storage session. */
export type BadgeModelPoseSessionApi = {
  set(session: PoseSession | null): void;
  clear(scope: "create" | "panel" | "active"): void;
  hasActive(): boolean;
};
