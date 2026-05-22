"use client";

import { useEffect, useState } from "react";

export const HIDE_LOCKED_STORAGE_KEY = "asexcepted.hideLockedAchievements";

function parseBool(v: string | null): boolean {
  if (!v) return false;
  const n = v.trim().toLowerCase();
  return n === "1" || n === "true" || n === "yes" || n === "on";
}

export function readHideLockedPreference(): boolean {
  if (typeof window === "undefined") return false;
  return parseBool(window.localStorage.getItem(HIDE_LOCKED_STORAGE_KEY));
}

export function writeHideLockedPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HIDE_LOCKED_STORAGE_KEY, enabled ? "1" : "0");
}

/** New accounts should see locked achievements until the user opts to hide them. */
export function resetHideLockedPreferenceForNewAccount(): void {
  writeHideLockedPreference(false);
}

export function useHideLockedPreference() {
  const [hideLocked, setHideLocked] = useState(false);

  useEffect(() => {
    setHideLocked(readHideLockedPreference());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== HIDE_LOCKED_STORAGE_KEY) return;
      setHideLocked(e.newValue === null ? false : parseBool(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (next: boolean) => {
    setHideLocked(next);
    writeHideLockedPreference(next);
  };

  return [hideLocked, update] as const;
}
