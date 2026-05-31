"use client";

import { useLocalStorage } from "usehooks-ts";

import { createBooleanPreference } from "@/lib/storage/boolean-preference";
import { getStorageItem, setStorageItem } from "@/lib/storage/client";
import { readJsonArray, writeJsonArray } from "@/lib/storage/json-preference";
import { storageKeys } from "@/lib/storage/keys";

export const soundsEnabledPreference = createBooleanPreference({
  key: storageKeys.soundsEnabled,
  defaultValue: true,
});

export const useSoundsEnabledPreference = soundsEnabledPreference.usePreference;

export const hideLockedPreference = createBooleanPreference({
  key: storageKeys.hideLockedAchievements,
  defaultValue: false,
});

export const useHideLockedPreference = hideLockedPreference.usePreference;

/** New accounts should see locked achievements until the user opts to hide them. */
export function resetHideLockedPreferenceForNewAccount(): void {
  hideLockedPreference.write(false);
}

export const badgeDebugOverlayPreference = createBooleanPreference({
  key: storageKeys.badgeDebugOverlay,
  defaultValue: false,
});

export const useBadgeDebugOverlayPreference = badgeDebugOverlayPreference.usePreference;

export type AchievementVisibilityFilter = "all" | "public" | "private";

const visibilityFilterOrder: AchievementVisibilityFilter[] = ["all", "public", "private"];

function parseVisibilityFilter(v: string | null): AchievementVisibilityFilter {
  if (v === "public" || v === "private") return v;
  return "all";
}

export function readVisibilityFilterPreference(): AchievementVisibilityFilter {
  return parseVisibilityFilter(getStorageItem(storageKeys.achievementVisibilityFilter));
}

export function writeVisibilityFilterPreference(
  filter: AchievementVisibilityFilter,
): void {
  setStorageItem(storageKeys.achievementVisibilityFilter, filter);
}

export function cycleVisibilityFilter(
  current: AchievementVisibilityFilter,
): AchievementVisibilityFilter {
  const index = visibilityFilterOrder.indexOf(current);
  return visibilityFilterOrder[(index + 1) % visibilityFilterOrder.length];
}

export function useVisibilityFilterPreference() {
  const [visibilityFilter, setVisibilityFilter] = useLocalStorage(
    storageKeys.achievementVisibilityFilter,
    "all" satisfies AchievementVisibilityFilter,
    {
      initializeWithValue: false,
      serializer: String,
      deserializer: (raw) => parseVisibilityFilter(raw),
    },
  );

  const update = (next: AchievementVisibilityFilter) => {
    setVisibilityFilter(next);
  };

  const cycle = () => {
    setVisibilityFilter((current) => {
      const next = cycleVisibilityFilter(current);
      writeVisibilityFilterPreference(next);
      return next;
    });
  };

  return { visibilityFilter, setVisibilityFilter: update, cycleVisibilityFilter: cycle };
}

function readCompletedTutorials(): Set<string> {
  return new Set(readJsonArray(storageKeys.tutorialsCompleted));
}

function writeCompletedTutorials(ids: Set<string>): void {
  writeJsonArray(storageKeys.tutorialsCompleted, ids);
}

export function isTutorialCompleted(tutorialId: string): boolean {
  return readCompletedTutorials().has(tutorialId);
}

export function markTutorialCompleted(tutorialId: string): void {
  const ids = readCompletedTutorials();
  ids.add(tutorialId);
  writeCompletedTutorials(ids);
}
