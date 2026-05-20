"use client";

import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ensurePushRegistered, type EnsurePushResult } from "@/lib/push/ensure-push-registered";
import { cn } from "@/lib/utils";

function statusMessage(status: EnsurePushResult | null): string {
  if (status === "registered") return "Notifications enabled";
  if (status === "permission-denied") return "Notifications blocked — allow them in browser settings";
  if (status === "not-authenticated") return "Sign in to enable notifications";
  if (status === "misconfigured") return "Push config missing";
  if (status === "register-failed") return "Could not save device token";
  if (status === "unsupported") return "Notifications unsupported on this device";
  return "Enable notifications";
}

export function NotificationBell() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<EnsurePushResult | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  const helper = useMemo(() => statusMessage(status), [status]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    void ensurePushRegistered({ requestPermission: false }).then(setStatus);
  }, []);

  async function onClick() {
    setBusy(true);
    setLiveMessage(null);
    try {
      const result = await ensurePushRegistered({ requestPermission: true });
      setStatus(result);
      setLiveMessage(statusMessage(result));
    } catch {
      setStatus("misconfigured");
      setLiveMessage(statusMessage("misconfigured"));
    } finally {
      setBusy(false);
    }
  }

  const active = status === "registered";

  return (
    <div className="absolute right-5 flex flex-col items-end gap-1">
      <button
        type="button"
        aria-label="Notifications"
        title={helper}
        onClick={() => void onClick()}
        disabled={busy}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full border transition",
          active
            ? "border-emerald-300/45 text-emerald-200"
            : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
          busy && "opacity-70",
        )}
      >
        <Bell className="h-4 w-4" />
      </button>
      {liveMessage ? (
        <p className="sr-only" aria-live="polite">
          {liveMessage}
        </p>
      ) : null}
    </div>
  );
}
