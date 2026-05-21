"use client";

const STORAGE_KEY = "asexcepted.tutorials.completed";

function readCompleted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeCompleted(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function isTutorialCompleted(tutorialId: string): boolean {
  return readCompleted().has(tutorialId);
}

export function markTutorialCompleted(tutorialId: string): void {
  const ids = readCompleted();
  ids.add(tutorialId);
  writeCompleted(ids);
}
