"use client";

import { useEffect } from "react";
import { getToken } from "firebase/messaging";

import { getFirebaseMessagingClient } from "@/lib/push/firebase-client";
import { createClient } from "@/lib/supabase/client";

export function PushRegistration() {
  useEffect(() => {
    void (async () => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;
      if (!("serviceWorker" in navigator)) return;
      if (!window.isSecureContext) return;
      if (Notification.permission !== "granted") return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const messaging = await getFirebaseMessagingClient();
      if (!messaging) return;

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
      if (!vapidKey) return;

      const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swReg,
      });
      if (!token) return;

      await fetch("/api/push/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
    })();
  }, []);

  return null;
}
