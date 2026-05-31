"use client";

import { useRef, useState } from "react";

import { AchievementDiscardEditConfirmDialog } from "@/components/achievements/dialogs/achievement-discard-edit-confirm-dialog";
import { LogoutButton } from "@/components/logout-button";
import { ProfileSettings } from "@/components/profile/profile-settings";
import { useUnsavedProfileGuard } from "@/components/profile/use-unsaved-profile-guard";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";

type ProfilePageShellProps = {
  isAdmin: boolean;
};

/** Client-only profile form, footer logout, and unsaved-change guard. */
export function ProfilePageShell({ isAdmin }: ProfilePageShellProps) {
  const discardRef = useRef<() => Promise<void>>(async () => {});
  const [dirty, setDirty] = useState(false);
  const { leaveIntent, dismissLeave, confirmLeave, requestBlockedAction } =
    useUnsavedProfileGuard({
      dirty,
      onDiscard: () => discardRef.current(),
    });

  return (
    <>
      <section className="w-full max-w-5xl flex-1 space-y-4 px-5 pb-8">
        <ProfileSettings
          isAdmin={isAdmin}
          onDirtyChange={setDirty}
          registerDiscardHandler={(fn) => {
            discardRef.current = fn;
          }}
        />
      </section>

      <footer
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center bg-background/95 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        aria-label="Account"
      >
        <LogoutButton
          onBeforeLogout={async () => {
            if (!dirty) return true;
            await requestBlockedAction(async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.assign(ROUTES.home);
            });
            return false;
          }}
        />
      </footer>

      {leaveIntent ? (
        <AchievementDiscardEditConfirmDialog
          onDismiss={dismissLeave}
          onConfirm={() => void confirmLeave()}
        />
      ) : null}
    </>
  );
}
