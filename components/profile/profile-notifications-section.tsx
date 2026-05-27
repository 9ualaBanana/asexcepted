"use client";

import { Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { AddToHomeScreenInstructions } from "@/components/pwa/add-to-home-screen-instructions";
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
        <div className="relative overflow-hidden rounded-md">
          <div
            className="pointer-events-none select-none space-y-2 opacity-40 blur-[1.5px]"
            aria-hidden
          >
            <p className="text-xs text-muted-foreground">
              Receive push notifications on this device when you enable them here.
            </p>
            <div className="flex justify-end">
              <div className="h-4 w-4 rounded border border-border bg-muted" />
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/30 px-2 py-3 text-center backdrop-blur-[2px]">
            <Smartphone
              className="h-5 w-5 text-muted-foreground"
              aria-hidden
            />
            <p className="text-xs font-medium leading-snug text-foreground">
              Add the app to your home screen to enable notifications
            </p>
            <AddToHomeScreenInstructions compact className="max-w-sm text-left" />
          </div>
        </div>
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
