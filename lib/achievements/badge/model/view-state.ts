import { LRUCache } from "lru-cache";

export type BadgeModelViewState = {
  yaw: number;
  pitch: number;
  inertiaYaw: number;
  inertiaPitch: number;
  mixerTime: number;
};

const cache = new LRUCache<string, BadgeModelViewState>({
  max: 300,
});

export const badgeModelViewStateStore = {
  read(key: string): BadgeModelViewState | undefined {
    return cache.get(key);
  },

  write(key: string, partial: Partial<BadgeModelViewState>): BadgeModelViewState {
    const next = { ...cache.get(key), ...partial } as BadgeModelViewState;
    cache.set(key, next);
    return next;
  },

  readMixerTime(key: string): number {
    return cache.get(key)?.mixerTime ?? 0;
  },
};
