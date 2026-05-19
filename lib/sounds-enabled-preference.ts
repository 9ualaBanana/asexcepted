"use client";

import { useEffect, useState } from "react";

export const SOUNDS_ENABLED_STORAGE_KEY = "asexcepted.soundsEnabled";

function parseBool(v: string | null): boolean {
  if (!v) return false;
  const n = v.trim().toLowerCase();
  return n === "1" || n === "true" || n === "yes" || n === "on";
}

/** Default on when unset so existing behavior is preserved for first visit. */
export function readSoundsEnabledPreference(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(SOUNDS_ENABLED_STORAGE_KEY);
  if (raw === null) return true;
  return parseBool(raw);
}

export function writeSoundsEnabledPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUNDS_ENABLED_STORAGE_KEY, enabled ? "1" : "0");
}

export function useSoundsEnabledPreference() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(readSoundsEnabledPreference());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SOUNDS_ENABLED_STORAGE_KEY) return;
      setEnabled(e.newValue === null ? true : parseBool(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    writeSoundsEnabledPreference(next);
  };

  return [enabled, update] as const;
}
