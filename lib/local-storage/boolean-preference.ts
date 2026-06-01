"use client";

import { useLocalStorage } from "usehooks-ts";

import { getStorageItem, setStorageItem } from "@/lib/local-storage/client";

/** Supports legacy `"1"` / `"0"` and JSON booleans. */
export function deserializeStoredBoolean(raw: string | null, fallback: boolean): boolean {
  if (raw === null) return fallback;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "1" || trimmed === "true" || trimmed === "yes" || trimmed === "on") {
    return true;
  }
  if (trimmed === "0" || trimmed === "false" || trimmed === "no" || trimmed === "off") {
    return false;
  }
  try {
    return Boolean(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

function serializeBoolean(value: boolean): string {
  return value ? "1" : "0";
}

type BooleanPreferenceConfig = {
  key: string;
  /** Value when the key is missing (and for SSR / hook initial state). */
  defaultValue: boolean;
};

export function createBooleanPreference({ key, defaultValue }: BooleanPreferenceConfig) {
  const storage = {
    read(): boolean {
      return deserializeStoredBoolean(getStorageItem(key), defaultValue);
    },
    write(enabled: boolean): void {
      setStorageItem(key, serializeBoolean(enabled));
    },
  };

  function usePreference() {
    const [enabled, setEnabled] = useLocalStorage(key, defaultValue, {
      initializeWithValue: false,
      serializer: serializeBoolean,
      deserializer: (raw) => deserializeStoredBoolean(raw, defaultValue),
    });

    const update = (next: boolean) => {
      setEnabled(next);
    };

    return [enabled, update] as const;
  }

  return { ...storage, usePreference, key };
}
