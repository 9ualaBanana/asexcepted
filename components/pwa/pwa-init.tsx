"use client";

import { useEffect } from "react";
import { ROUTES } from "@/lib/routes";

export function PwaInit() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register(ROUTES.firebaseMessagingSw).catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
