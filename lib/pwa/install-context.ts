/** True when the app is running as an installed PWA (home screen / standalone). */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/**
 * Web push on iOS requires installing to the home screen first.
 * Android/desktop browsers can enable push in-tab — no install prompt.
 */
export function needsHomeScreenInstallForPush(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalonePwa()) return false;
  return isIosDevice();
}
