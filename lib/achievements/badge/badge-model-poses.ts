import { Group, type Object3D } from "three";

/** Matches viewer orbit clamp in badge-model-viewer. */
export const BADGE_MODEL_MAX_PITCH_RAD = Math.PI / 2.2;

const HORIZONTAL_YAWS = [
  { id: "front", yaw: 0 },
  { id: "left", yaw: -Math.PI / 2 },
  { id: "right", yaw: Math.PI / 2 },
  { id: "back", yaw: Math.PI },
] as const;

const PITCH_VARIANTS = [
  { suffix: "", pitch: 0 },
  { suffix: "_up", pitch: BADGE_MODEL_MAX_PITCH_RAD },
  { suffix: "_down", pitch: -BADGE_MODEL_MAX_PITCH_RAD },
] as const;

export type BadgeModelPosePreset = {
  id: string;
  yaw: number;
  pitch: number;
};

export const BADGE_MODEL_POSE_PRESETS: BadgeModelPosePreset[] = HORIZONTAL_YAWS.flatMap(
  (horizontal) =>
    PITCH_VARIANTS.map((pitchVariant) => ({
      id: `${horizontal.id}${pitchVariant.suffix}`,
      yaw: horizontal.yaw,
      pitch: pitchVariant.pitch,
    })),
);

export function applyBadgeModelPose(root: Object3D, yaw: number, pitch: number): void {
  root.rotation.set(pitch, yaw, 0, "YXZ");
}

export function createBadgeModelPoseRoot(model: Object3D, yaw: number, pitch: number): Group {
  const root = new Group();
  root.add(model);
  applyBadgeModelPose(root, yaw, pitch);
  return root;
}
