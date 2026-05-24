"use client";

import { useEffect, useState } from "react";

export type AchievementVisibilityFilter = "all" | "public" | "private";

export const VISIBILITY_FILTER_STORAGE_KEY = "asexcepted.achievementVisibilityFilter";

const ORDER: AchievementVisibilityFilter[] = ["all", "public", "private"];

function parseFilter(v: string | null): AchievementVisibilityFilter {
  if (v === "public" || v === "private") return v;
  return "all";
}

export function readVisibilityFilterPreference(): AchievementVisibilityFilter {
  if (typeof window === "undefined") return "all";
  return parseFilter(window.localStorage.getItem(VISIBILITY_FILTER_STORAGE_KEY));
}

export function writeVisibilityFilterPreference(filter: AchievementVisibilityFilter): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VISIBILITY_FILTER_STORAGE_KEY, filter);
}

export function cycleVisibilityFilter(
  current: AchievementVisibilityFilter,
): AchievementVisibilityFilter {
  const index = ORDER.indexOf(current);
  return ORDER[(index + 1) % ORDER.length];
}

export function useVisibilityFilterPreference() {
  const [visibilityFilter, setVisibilityFilter] =
    useState<AchievementVisibilityFilter>("all");

  useEffect(() => {
    setVisibilityFilter(readVisibilityFilterPreference());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== VISIBILITY_FILTER_STORAGE_KEY) return;
      setVisibilityFilter(
        e.newValue === null ? "all" : parseFilter(e.newValue),
      );
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (next: AchievementVisibilityFilter) => {
    setVisibilityFilter(next);
    writeVisibilityFilterPreference(next);
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
