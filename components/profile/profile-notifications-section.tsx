"use client";

import { useEffect, useState } from "react";

import { AddToHomeScreenInstallBlock } from "@/components/pwa/add-to-home-screen-instructions";
import { Label } from "@/components/ui/label";
import { needsHomeScreenInstallForPush } from "@/lib/pwa/install-context";
import { cn } from "@/lib/utils";

type ProfileNotificationsSectionProps = {
  pushEnabled: boolean;
  pushBusy: boolean;
  pushStatusLoading: boolean;
  onToggle: (enabled: boolean) => void;
};

export function ProfileNotificationsSection({
  pushEnabled,
  pushBusy,
  pushStatusLoading,
  onToggle,
}: ProfileNotificationsSectionProps) {
  const [installRequired, setInstallRequired] = useState(false);

  useEffect(() => {
    setInstallRequired(needsHomeScreenInstallForPush());
  }, []);

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
      <Label htmlFor="profile-notifications-enabled">Notifications</Label>

      {installRequired ? (
        <AddToHomeScreenInstallBlock variant="profile" />
      ) : (
        <label
          htmlFor="profile-notifications-enabled"
          className={cn("flex cursor-pointer items-center justify-between gap-3")}
        >
          <p className="text-xs text-muted-foreground">
            Receive push notifications on this device when you enable them here.
          </p>
          <input
            id="profile-notifications-enabled"
            type="checkbox"
            checked={pushEnabled}
            disabled={pushBusy || pushStatusLoading}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-foreground disabled:opacity-50"
          />
        </label>
      )}
    </div>
  );
}
