"use client";

import { useEffect } from "react";

type ScrollLockSnapshot = {
  scrollY: number;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
};

let lockCount = 0;
let snapshot: ScrollLockSnapshot | null = null;
let lastTouchY = 0;

export function resetBodyScrollLock(): void {
  if (typeof document === "undefined") return;
  lockCount = 0;
  releaseScrollLock();
}

export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [active]);
}

function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    const { body, documentElement } = document;
    snapshot = {
      scrollY: window.scrollY,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      htmlOverflow: documentElement.style.overflow,
      htmlOverscrollBehavior: documentElement.style.overscrollBehavior,
    };
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${snapshot.scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
  }
  lockCount += 1;
}

function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount === 0) releaseScrollLock();
}

function releaseScrollLock(): void {
  document.removeEventListener("touchstart", onTouchStart);
  document.removeEventListener("touchmove", onTouchMove);
  const saved = snapshot;
  snapshot = null;
  const { body, documentElement } = document;
  body.style.overflow = saved?.bodyOverflow ?? "";
  body.style.position = saved?.bodyPosition ?? "";
  body.style.top = saved?.bodyTop ?? "";
  body.style.left = saved?.bodyLeft ?? "";
  body.style.right = saved?.bodyRight ?? "";
  body.style.width = saved?.bodyWidth ?? "";
  documentElement.style.overflow = saved?.htmlOverflow ?? "";
  documentElement.style.overscrollBehavior = saved?.htmlOverscrollBehavior ?? "";
  if (saved) window.scrollTo(0, saved.scrollY);
}

function onTouchStart(event: TouchEvent): void {
  lastTouchY = event.touches[0]?.clientY ?? 0;
}

function onTouchMove(event: TouchEvent): void {
  const nextY = event.touches[0]?.clientY ?? lastTouchY;
  const deltaY = nextY - lastTouchY;
  lastTouchY = nextY;
  if (!event.cancelable) return;
  if (canConsumeScroll(event.target, deltaY)) return;
  event.preventDefault();
}

function canConsumeScroll(target: EventTarget | null, deltaY: number): boolean {
  if (!(target instanceof Element) || deltaY === 0) return false;
  let node: Element | null = target;
  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = window.getComputedStyle(node).overflowY;
    const scrollable = overflowY === "auto" || overflowY === "scroll";
    if (scrollable && node.scrollHeight > node.clientHeight + 1) {
      const atTop = node.scrollTop <= 0;
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
      if ((deltaY > 0 && !atTop) || (deltaY < 0 && !atBottom)) return true;
    }
    node = node.parentElement;
  }
  return false;
}
