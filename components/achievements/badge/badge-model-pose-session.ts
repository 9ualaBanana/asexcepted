"use client";

import type { BadgeModelPosePreset } from "@/lib/achievements/badge-model-poses";

export type BadgeModelPoseVariant = BadgeModelPosePreset & {
  previewBlob: Blob;
  previewUrl: string;
};

export type BadgeModelPoseSession = {
  modelPath: string;
  variants: BadgeModelPoseVariant[];
  selectedIndex: number;
  finalized: boolean;
};

export function createBadgeModelPoseVariant(
  preset: BadgeModelPosePreset,
  previewBlob: Blob,
): BadgeModelPoseVariant {
  return {
    ...preset,
    previewBlob,
    previewUrl: URL.createObjectURL(previewBlob),
  };
}

export function revokeBadgeModelPoseSession(session: BadgeModelPoseSession | null): void {
  if (!session) return;
  for (const variant of session.variants) {
    URL.revokeObjectURL(variant.previewUrl);
  }
}

export function getSelectedBadgeModelPoseVariant(
  session: BadgeModelPoseSession | null,
): BadgeModelPoseVariant | null {
  if (!session || session.variants.length === 0) return null;
  const index = Math.min(Math.max(session.selectedIndex, 0), session.variants.length - 1);
  return session.variants[index] ?? null;
}

export function cycleBadgeModelPoseSession(
  session: BadgeModelPoseSession,
  direction: 1 | -1 = 1,
): BadgeModelPoseSession {
  const count = session.variants.length;
  if (count === 0) return session;
  const nextIndex = (session.selectedIndex + direction + count) % count;
  return { ...session, selectedIndex: nextIndex };
}
