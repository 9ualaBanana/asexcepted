"use client";

import { useEffect } from "react";
import { registerBrowserPushToken } from "@/lib/push/register-browser-push";

export function PushRegistration() {
  useEffect(() => {
    void (async () => {
      await registerBrowserPushToken({ requestPermission: false });
    })().catch(() => {
      // Non-blocking background registration.
    });
  }, []);

  return null;
}
