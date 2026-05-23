"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ProfileLeaveIntent = "blocked";

export function useUnsavedProfileGuard(options: {
  dirty: boolean;
  onDiscard: () => void | Promise<void>;
}) {
  const { dirty, onDiscard } = options;
  const router = useRouter();
  const pendingHrefRef = useRef<string | null>(null);
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);
  const [leaveIntent, setLeaveIntent] = useState<ProfileLeaveIntent | null>(
    null,
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;

    const onClickCapture = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (href.startsWith("/profile")) return;
      e.preventDefault();
      e.stopPropagation();
      pendingHrefRef.current = href;
      setLeaveIntent("blocked");
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [dirty]);

  const dismissLeave = useCallback(() => {
    pendingHrefRef.current = null;
    pendingActionRef.current = null;
    setLeaveIntent(null);
  }, []);

  const confirmLeave = useCallback(async () => {
    const href = pendingHrefRef.current;
    const action = pendingActionRef.current;
    pendingHrefRef.current = null;
    pendingActionRef.current = null;
    setLeaveIntent(null);
    await onDiscard();
    if (href) {
      router.push(href);
    } else if (action) {
      await action();
    }
  }, [onDiscard, router]);

  const requestBlockedAction = useCallback(
    async (action: () => void | Promise<void>) => {
      if (!dirty) {
        await action();
        return true;
      }
      pendingActionRef.current = action;
      setLeaveIntent("blocked");
      return false;
    },
    [dirty],
  );

  return {
    leaveIntent,
    dismissLeave,
    confirmLeave,
    requestBlockedAction,
  };
}
