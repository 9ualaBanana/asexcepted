"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProfilePreferenceRow } from "@/components/profile/profile-preference-row";
import { useBadgeDebugOverlayPreference } from "@/lib/local-storage";
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
      <ProfilePreferenceRow
        id="profile-badge-debug-overlay"
        title="Badge debug overlay"
        description="Show performance telemetry overlay on achievements pages."
        checked={badgeDebugOverlay}
        onCheckedChange={setBadgeDebugOverlay}
      />

      <div className="flex justify-center pt-1">
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
