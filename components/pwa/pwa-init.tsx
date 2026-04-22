"use client";

import { useEffect, useState } from "react";

export function PwaInit() {
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  useEffect(() => {
    const canPrompt =
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default";
    setShowPushPrompt(canPrompt);
  }, []);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "default") {
      setShowPushPrompt(false);
    }
  }

  if (!showPushPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={enableNotifications}
      className="fixed bottom-4 right-4 z-50 rounded-md border border-cyan-400/50 bg-slate-900 px-3 py-2 text-xs text-cyan-200 shadow-md hover:bg-slate-800"
    >
      Enable notifications
    </button>
  );
}
