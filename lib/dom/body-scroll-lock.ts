"use client";

import { useEffect } from "react";

let lockCount = 0;
let savedOverflow: string | null = null;

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow ?? "";
    savedOverflow = null;
  }
}

/** Clears a stale lock when no modal should be holding scroll (nested restore races). */
export function resetBodyScrollLock(): void {
  if (typeof document === "undefined") return;
  lockCount = 0;
  savedOverflow = null;
  document.body.style.overflow = "";
}

export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [active]);
}
