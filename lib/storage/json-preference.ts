import { getStorageItem, setStorageItem } from "@/lib/storage/client";

export function readJsonArray(key: string): string[] {
  const raw = getStorageItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function writeJsonArray(key: string, values: Iterable<string>): void {
  setStorageItem(key, JSON.stringify([...values]));
}
