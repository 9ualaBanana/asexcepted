export type BadgeModelViewState = {
  yaw: number;
  pitch: number;
  inertiaYaw: number;
  inertiaPitch: number;
  mixerTime: number;
};

export const badgeModelViewStateCache = new Map<string, BadgeModelViewState>();
