"use client";

import { useEffect, useState } from "react";

export function useIosDevice(): boolean | null {
  const [ios, setIos] = useState<boolean | null>(null);

  useEffect(() => {
    setIos(isIosDevice());
  }, []);

  return ios;
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
