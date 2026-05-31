"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBadgeDebugOverlayPreference } from "@/lib/storage";
import { ensurePushRegistered } from "@/lib/push/ensure-push-registered";

type AdminProfileToolsProps = {
  onError: (message: string | null) => void;
  onPushHint: (message: string | null) => void;
};

export function AdminProfileTools({ onError, onPushHint }: AdminProfileToolsProps) {
  const [badgeDebugOverlay, setBadgeDebugOverlay] = useBadgeDebugOverlayPreference();
  const [sendingPushTest, setSendingPushTest] = useState(false);

  async function handleSendPushTest() {
    setSendingPushTest(true);
    onPushHint(null);
    onError(null);
    try {
      const registerResult = await ensurePushRegistered({ requestPermission: true });
      if (registerResult !== "registered") {
        const messages: Record<string, string> = {
          "permission-denied":
            "Enable notifications for this site in your browser (iOS: Settings → Safari → Notifications, or reinstall the PWA).",
          unsupported: "This browser does not support web push.",
          misconfigured: "Firebase or VAPID configuration is missing.",
          "not-authenticated": "Sign in again to enable push.",
          "register-failed":
            "Could not save your device token. Apply the latest Supabase migrations (push token account switch), then try again.",
        };
        onError(messages[registerResult] ?? "Could not register for push.");
        return;
      }

      const response = await fetch("/api/push/test", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        successCount?: number;
        requested?: number;
      };
      if (!response.ok || !payload.ok) {
        onError(payload.error ?? "Could not send test push.");
        return;
      }
      onPushHint(
        `Test push sent (${payload.successCount ?? 0}/${payload.requested ?? 0} delivered).`,
      );
    } catch {
      onError("Could not send test push.");
    } finally {
      setSendingPushTest(false);
    }
  }

  return (
    <>
      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
        <Label htmlFor="profile-badge-debug-overlay">Badge debug overlay</Label>
        <label
          htmlFor="profile-badge-debug-overlay"
          className="flex cursor-pointer items-center justify-between gap-3"
        >
          <p className="text-xs text-muted-foreground">
            Show performance telemetry overlay on achievements pages.
          </p>
          <input
            id="profile-badge-debug-overlay"
            type="checkbox"
            checked={badgeDebugOverlay}
            onChange={(e) => setBadgeDebugOverlay(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-foreground"
          />
        </label>
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          disabled={sendingPushTest}
          onClick={() => void handleSendPushTest()}
        >
          {sendingPushTest ? "Sending push…" : "Send test push"}
        </Button>
      </div>
    </>
  );
}
