"use client";

import { useEffect, useState } from "react";

import { AddToHomeScreenInstallBlock } from "@/components/pwa/add-to-home-screen-instructions";
import {
  ProfilePreferenceRow,
  ProfilePreferenceRowSkeleton,
} from "@/components/profile/profile-preference-row";
import { needsHomeScreenInstallForPush } from "@/lib/pwa/install-context";

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
  const [installChecked, setInstallChecked] = useState(false);

  useEffect(() => {
    setInstallRequired(needsHomeScreenInstallForPush());
    setInstallChecked(true);
  }, []);

  if (!installChecked || pushStatusLoading) {
    return <ProfilePreferenceRowSkeleton />;
  }

  if (installRequired) {
    return (
      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
        <p className="text-sm font-medium leading-none">Notifications</p>
        <AddToHomeScreenInstallBlock variant="profile" />
      </div>
    );
  }

  return (
    <ProfilePreferenceRow
      id="profile-notifications-enabled"
      title="Notifications"
      description="Receive push notifications on this device"
      checked={pushEnabled}
      disabled={pushBusy}
      onCheckedChange={onToggle}
    />
  );
}
