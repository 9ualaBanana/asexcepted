"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminProfileTools } from "@/components/admin/admin-profile-tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSoundsEnabledPreference } from "@/lib/sounds-enabled-preference";
import { ensurePushRegistered } from "@/lib/push/ensure-push-registered";
import {
  fetchDevicePushRegistered,
  getDeviceFcmToken,
  unregisterDevicePushToken,
} from "@/lib/push/device-push-status";

function displayNameFromMetadata(meta: Record<string, unknown> | null | undefined) {
  if (!meta) return "";
  const v = meta.display_name ?? meta.full_name ?? meta.name;
  if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

type ProfileSettingsProps = {
  isAdmin?: boolean;
};

/**
 * Profile fields backed by Supabase Auth `user_metadata` only (single source of truth for display name).
 */
export function ProfileSettings({ isAdmin = false }: ProfileSettingsProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [soundsEnabled, setSoundsEnabled] = useSoundsEnabledPreference();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatusLoading, setPushStatusLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);
  const [pushHint, setPushHint] = useState<string | null>(null);

  const refreshPushToggle = useCallback(async () => {
    setPushStatusLoading(true);
    const tokenResult = await getDeviceFcmToken();
    if (!tokenResult.ok) {
      setPushEnabled(false);
      setPushStatusLoading(false);
      return;
    }
    const registered = await fetchDevicePushRegistered(tokenResult.token);
    setPushEnabled(registered === true);
    setPushStatusLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSavedHint(false);
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) {
      setError(userError?.message ?? "Not signed in.");
      setLoading(false);
      return;
    }
    const u = data.user;
    setEmail(u.email ?? "");
    const name = displayNameFromMetadata(u.user_metadata as Record<string, unknown>);
    setDisplayName(name);
    setLoading(false);
    await refreshPushToggle();
  }, [refreshPushToggle, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedHint(false);
    const trimmed = displayName.trim();
    const { error: updErr } = await supabase.auth.updateUser({
      data: trimmed
        ? {
            display_name: trimmed,
            full_name: trimmed,
            name: trimmed,
          }
        : {
            display_name: "",
            full_name: "",
            name: "",
          },
    });
    if (updErr) {
      setError(updErr.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setSavedHint(true);
    router.refresh();
    await load();
  }

  async function handlePushToggle(next: boolean) {
    setPushBusy(true);
    setError(null);
    setPushHint(null);
    try {
      if (next) {
        const registerResult = await ensurePushRegistered({ requestPermission: true });
        if (registerResult !== "registered") {
          const messages: Record<string, string> = {
            "permission-denied":
              "Enable notifications for this site in your browser (iOS: Settings → Safari → Notifications, or reinstall the PWA).",
            unsupported: "This browser does not support web push on this device.",
            misconfigured: "Firebase or VAPID configuration is missing.",
            "not-authenticated": "Sign in again to enable push.",
            "register-failed":
              "Could not save your device token. Apply the latest Supabase migrations (push token account switch), then try again.",
          };
          setError(messages[registerResult] ?? "Could not register for push.");
          return;
        }
      } else {
        const tokenResult = await getDeviceFcmToken();
        if (tokenResult.ok) {
          const ok = await unregisterDevicePushToken(tokenResult.token);
          if (!ok) {
            setError("Could not disable notifications for this device.");
            return;
          }
        }
      }
      await refreshPushToggle();
    } catch {
      setError("Could not update notification settings.");
    } finally {
      setPushBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto w-full max-w-md space-y-6 text-left"
    >
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {savedHint ? (
        <p className="text-sm text-muted-foreground">Saved.</p>
      ) : null}
      {pushHint ? (
        <p className="text-sm text-muted-foreground">{pushHint}</p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          readOnly
          className="bg-muted/40"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-display-name">Display name</Label>
        <Input
          id="profile-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Shown in the app header and Supabase Auth"
          autoComplete="name"
        />
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
        <Label htmlFor="profile-sounds-enabled">Sounds</Label>
        <label
          htmlFor="profile-sounds-enabled"
          className="flex cursor-pointer items-center justify-between gap-3"
        >
          <p className="text-xs text-muted-foreground">
            Play unlock and save sounds in the achievements experience.
          </p>
          <input
            id="profile-sounds-enabled"
            type="checkbox"
            checked={soundsEnabled}
            onChange={(e) => setSoundsEnabled(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-foreground"
          />
        </label>
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
        <Label htmlFor="profile-notifications-enabled">Notifications</Label>
        <label
          htmlFor="profile-notifications-enabled"
          className="flex cursor-pointer items-center justify-between gap-3"
        >
          <p className="text-xs text-muted-foreground">
            Receive push notifications on this device when you enable them here.
          </p>
          <input
            id="profile-notifications-enabled"
            type="checkbox"
            checked={pushEnabled}
            disabled={pushBusy || pushStatusLoading}
            onChange={(e) => void handlePushToggle(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-foreground disabled:opacity-50"
          />
        </label>
      </div>

      {isAdmin ? (
        <AdminProfileTools onError={setError} onPushHint={setPushHint} />
      ) : null}

      <div className="flex justify-center">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
