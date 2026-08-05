"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminProfileTools } from "@/components/admin/admin-profile-tools";
import { ProfileNotificationsSection } from "@/components/profile/profile-notifications-section";
import {
  ProfilePreferenceRow,
  ProfilePreferenceRowSkeleton,
} from "@/components/profile/profile-preference-row";
import { ProfileAvatarSlot } from "@/components/profile/profile-avatar-slot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  beginProfileAvatarSession,
  commitProfileAvatarUploadSession,
  deleteImageKitFileQuietly,
  discardProfileAvatarUploadSession,
  stageProfileAvatarUpload,
  type ProfileAvatarUploadSession,
} from "@/components/achievements/badge/upload/profile-avatar-session";
import { fetchProfileRow, updateProfileAvatar } from "@/lib/achievements/data/profile-db";
import { ensurePushRegistered } from "@/lib/push/ensure-push-registered";
import {
  fetchDevicePushRegistered,
  getDeviceFcmToken,
  unregisterDevicePushToken,
} from "@/lib/push/device-push-status";
import { useSoundsEnabledPreference } from "@/lib/local-storage";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";
import { useErrorToast } from "@/lib/toast";

function displayNameFromMetadata(meta: Record<string, unknown> | null | undefined) {
  if (!meta) return "";
  const v = meta.display_name ?? meta.full_name ?? meta.name;
  if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

type ProfileSettingsProps = {
  isAdmin?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  registerDiscardHandler?: (handler: () => Promise<void>) => void;
};

export function ProfileSettings({
  isAdmin = false,
  onDirtyChange,
  registerDiscardHandler,
}: ProfileSettingsProps) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const avatarSessionRef = useRef<ProfileAvatarUploadSession>(
    beginProfileAvatarSession(""),
  );

  const [soundsEnabled, setSoundsEnabled] = useSoundsEnabledPreference();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [savedAvatarUrl, setSavedAvatarUrl] = useState("");
  const [avatarFileId, setAvatarFileId] = useState("");
  const [savedAvatarFileId, setSavedAvatarFileId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatusLoading, setPushStatusLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushHint, setPushHint] = useState<string | null>(null);

  useErrorToast(error, { id: "profile-settings" });

  const displayNameDirty = displayName.trim() !== savedDisplayName.trim();
  const avatarDirty =
    avatarPreviewUrl.trim() !== savedAvatarUrl.trim() ||
    avatarFileId.trim() !== savedAvatarFileId.trim();
  const isDirty = displayNameDirty || avatarDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const discardChanges = useCallback(async () => {
    discardProfileAvatarUploadSession(avatarSessionRef.current);
    setAvatarPreviewUrl(savedAvatarUrl);
    setAvatarFileId(savedAvatarFileId);
    setDisplayName(savedDisplayName);
    setError(null);
  }, [savedAvatarFileId, savedAvatarUrl, savedDisplayName]);

  useEffect(() => {
    registerDiscardHandler?.(discardChanges);
  }, [discardChanges, registerDiscardHandler]);

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
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) {
      setError(userError?.message ?? "Not signed in.");
      setLoading(false);
      return;
    }
    const u = data.user;
    setUserId(u.id);
    setEmail(u.email ?? "");
    const name = displayNameFromMetadata(u.user_metadata as Record<string, unknown>);
    setDisplayName(name);
    setSavedDisplayName(name);

    const profileResult = await fetchProfileRow(supabase, u.id);
    if (profileResult.isErr()) {
      setError(profileResult.error);
      setLoading(false);
      return;
    }

    const savedUrl = profileResult.value?.avatar_url?.trim() ?? "";
    const savedFileId = profileResult.value?.avatar_file_id?.trim() ?? "";
    avatarSessionRef.current = beginProfileAvatarSession(savedFileId);
    setSavedAvatarUrl(savedUrl);
    setSavedAvatarFileId(savedFileId);
    setAvatarPreviewUrl(savedUrl);
    setAvatarFileId(savedFileId);

    setLoading(false);
    await refreshPushToggle();
  }, [refreshPushToggle, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleAvatarUploadSuccess(url: string, fileId: string) {
    stageProfileAvatarUpload(avatarSessionRef.current, fileId);
    setAvatarPreviewUrl(url);
    setAvatarFileId(fileId);
    setError(null);
  }

  async function handleSave() {
    if (!userId || !isDirty || saving) return;
    setSaving(true);
    setError(null);

    const trimmed = displayName.trim();
    if (displayNameDirty) {
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
      setSavedDisplayName(trimmed);
      setDisplayName(trimmed);
    }

    if (avatarDirty) {
      const nextUrl = avatarPreviewUrl.trim() || null;
      const nextFileId = avatarFileId.trim() || null;
      const avatarUpdate = await updateProfileAvatar(supabase, userId, {
        avatar_url: nextUrl,
        avatar_file_id: nextFileId,
      });
      if (avatarUpdate.isErr()) {
        setError(avatarUpdate.error);
        setSaving(false);
        return;
      }

      const replacedOnSave = commitProfileAvatarUploadSession(
        avatarSessionRef.current,
        nextFileId ?? "",
      );
      await deleteImageKitFileQuietly(replacedOnSave);

      setSavedAvatarUrl(nextUrl ?? "");
      setSavedAvatarFileId(nextFileId ?? "");
      setAvatarPreviewUrl(nextUrl ?? "");
      setAvatarFileId(nextFileId ?? "");
    }

    setSaving(false);
    router.refresh();
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
              "Could not enable notifications. If you use iPhone, open the app from your home screen, then try again in Profile.",
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
    return <ProfileSettingsSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 text-left">
      {pushHint ? (
        <p className="text-sm text-muted-foreground">{pushHint}</p>
      ) : null}

      <div className="space-y-6">
        <div className="flex justify-center pb-2">
          <ProfileAvatarSlot
            layout="profile"
            editable
            disabled={saving}
            imageUrl={avatarPreviewUrl}
            onUploadSuccess={handleAvatarUploadSuccess}
          />
        </div>

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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSave();
              }
            }}
            placeholder="Shown in the app header and Supabase Auth"
            autoComplete="name"
            disabled={saving}
          />
        </div>

        <div className="flex justify-center">
          <Button
            type="button"
            disabled={saving || !isDirty}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="border-t border-border/50 pt-6">
        <div className="space-y-3">
          <ProfilePreferenceRow
            id="profile-sounds-enabled"
            title="Sounds"
            description="Play unlock and save sounds"
            checked={soundsEnabled}
            onCheckedChange={setSoundsEnabled}
          />

          <ProfileNotificationsSection
            pushEnabled={pushEnabled}
            pushBusy={pushBusy}
            pushStatusLoading={pushStatusLoading}
            onToggle={(next) => void handlePushToggle(next)}
          />

          {isAdmin ? (
            <AdminProfileTools onError={setError} onPushHint={setPushHint} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProfileSettingsSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-md space-y-6 text-left"
      aria-busy
      aria-label="Loading profile"
    >
      <div className="flex justify-center pb-2">
        <div className="h-24 w-24 animate-pulse rounded-full bg-muted/50" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-14 animate-pulse rounded bg-muted/45" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/35" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted/45" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/35" />
      </div>
      <div className="flex justify-center">
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted/40" />
      </div>
      <div className="space-y-3 border-t border-border/50 pt-6">
        <ProfilePreferenceRowSkeleton />
        <ProfilePreferenceRowSkeleton />
      </div>
    </div>
  );
}
