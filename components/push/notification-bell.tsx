"use client";

import { Bell } from "lucide-react";
import { useMemo, useState } from "react";

import { registerBrowserPushToken } from "@/lib/push/register-browser-push";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const helper = useMemo(() => {
    if (status === "registered") return "Notifications enabled";
    if (status === "permission-denied") return "Notifications blocked";
    if (status === "not-authenticated") return "Sign in to enable notifications";
    if (status === "misconfigured") return "Push config missing";
    if (status === "unsupported") return "Notifications unsupported on this device";
    return "Enable notifications";
  }, [status]);

  async function onClick() {
    setBusy(true);
    try {
      const result = await registerBrowserPushToken({ requestPermission: true });
      setStatus(result);
    } catch {
      setStatus("misconfigured");
    } finally {
      setBusy(false);
    }
  }

  const active = status === "registered";

  return (
    <button
      type="button"
      aria-label="Notifications"
      title={helper}
      onClick={() => void onClick()}
      disabled={busy}
      className={cn(
        "absolute right-5 inline-flex h-8 w-8 items-center justify-center rounded-full border transition",
        active
          ? "border-emerald-300/45 text-emerald-200"
          : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
        busy && "opacity-70",
      )}
    >
      <Bell className="h-4 w-4" />
    </button>
  );
}
