"use client";

import { useEffect, useState } from "react";

export const BADGE_RENDER_OPTIMIZED_STORAGE_KEY = "asexcepted.badgeRenderOptimized";
export const BADGE_DEBUG_OVERLAY_STORAGE_KEY = "asexcepted.badgeDebugOverlay";

function parseBool(v: string | null): boolean {
  if (!v) return false;
  const n = v.trim().toLowerCase();
  return n === "1" || n === "true" || n === "yes" || n === "on";
}

export function readBadgeRenderOptimizedPreference(): boolean {
  if (typeof window === "undefined") return false;
  return parseBool(window.localStorage.getItem(BADGE_RENDER_OPTIMIZED_STORAGE_KEY));
}

export function writeBadgeRenderOptimizedPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    BADGE_RENDER_OPTIMIZED_STORAGE_KEY,
    enabled ? "1" : "0",
  );
}

export function useBadgeRenderOptimizedPreference() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(readBadgeRenderOptimizedPreference());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== BADGE_RENDER_OPTIMIZED_STORAGE_KEY) return;
      setEnabled(parseBool(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    writeBadgeRenderOptimizedPreference(next);
  };

  return [enabled, update] as const;
}

export function readBadgeDebugOverlayPreference(): boolean {
  if (typeof window === "undefined") return false;
  return parseBool(window.localStorage.getItem(BADGE_DEBUG_OVERLAY_STORAGE_KEY));
}

export function writeBadgeDebugOverlayPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BADGE_DEBUG_OVERLAY_STORAGE_KEY, enabled ? "1" : "0");
}

export function useBadgeDebugOverlayPreference() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(readBadgeDebugOverlayPreference());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== BADGE_DEBUG_OVERLAY_STORAGE_KEY) return;
      setEnabled(parseBool(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    writeBadgeDebugOverlayPreference(next);
  };

  return [enabled, update] as const;
}

