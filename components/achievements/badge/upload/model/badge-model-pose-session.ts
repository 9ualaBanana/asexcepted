"use client";

export type BadgeModelPoseSession = {
  modelPath: string;
  initialPreviewUrl: string;
  createPreviewBlob: (yaw: number, pitch: number) => Promise<Blob>;
  finalized: boolean;
};

export function revokeBadgeModelPoseSession(session: BadgeModelPoseSession | null): void {
  if (!session) return;
  URL.revokeObjectURL(session.initialPreviewUrl);
}
