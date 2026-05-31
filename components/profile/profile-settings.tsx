"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminProfileTools } from "@/components/admin/admin-profile-tools";
import { normalizeImageKitFileId } from "@/components/achievements/badge";
import { ProfileNotificationsSection } from "@/components/profile/profile-notifications-section";
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
} from "@/lib/profile/profile-avatar-session";
import { fetchProfileRow, updateProfileAvatar } from "@/lib/profile/profile-db";
import { ensurePushRegistered } from "@/lib/push/ensure-push-registered";
import {
  fetchDevicePushRegistered,
  getDeviceFcmToken,
  unregisterDevicePushToken,
} from "@/lib/push/device-push-status";
import { useSoundsEnabledPreference } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
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

/**
 * Profile fields backed by Supabase Auth `user_metadata` (display name) and
 * `public.profile` (avatar).
 */
export function ProfileSettings({
  isAdmin = false,
  onDirtyChange,
  registerDiscardHandler,
}: ProfileSettingsProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const avatarSessionRef = useRef<ProfileAvatarUploadSession>(
    beginProfileAvatarSession("", ""),
  );

  const [soundsEnabled, setSoundsEnabled] = useSoundsEnabledPreference();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarFileId, setAvatarFileId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatusLoading, setPushStatusLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);
  const [pushHint, setPushHint] = useState<string | null>(null);

  useErrorToast(error, { id: "profile-settings" });

  const displayNameDirty = displayName.trim() !== savedDisplayName.trim();
  const avatarDirty =
    avatarPreviewUrl.trim() !== avatarSessionRef.current.baselineUrl.trim() ||
    normalizeImageKitFileId(avatarFileId) !==
      normalizeImageKitFileId(avatarSessionRef.current.baselineFileId);
  const isDirty = displayNameDirty || avatarDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const discardChanges = useCallback(async () => {
    discardProfileAvatarUploadSession(avatarSessionRef.current);
    setAvatarPreviewUrl(avatarSessionRef.current.baselineUrl);
    setAvatarFileId(avatarSessionRef.current.baselineFileId);
    setDisplayName(savedDisplayName);
    setError(null);
    setSavedHint(false);
  }, [savedDisplayName]);

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
    setSavedHint(false);
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
    avatarSessionRef.current = beginProfileAvatarSession(savedUrl, savedFileId);
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
    setSavedHint(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
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

    const nextUrl = avatarPreviewUrl.trim() || null;
    const nextFileId = normalizeImageKitFileId(avatarFileId) || null;
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
      nextUrl ?? "",
      nextFileId ?? "",
    );
    await deleteImageKitFileQuietly(replacedOnSave);

    setAvatarPreviewUrl(avatarSessionRef.current.baselineUrl);
    setAvatarFileId(avatarSessionRef.current.baselineFileId);
    setSavedDisplayName(trimmed);
    setDisplayName(trimmed);

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
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto w-full max-w-md space-y-6 text-left"
    >
      {savedHint ? (
        <p className="text-sm text-muted-foreground">Saved.</p>
      ) : null}
      {pushHint ? (
        <p className="text-sm text-muted-foreground">{pushHint}</p>
      ) : null}

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
          onChange={(e) => {
            setDisplayName(e.target.value);
            setSavedHint(false);
          }}
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

      <ProfileNotificationsSection
        pushEnabled={pushEnabled}
        pushBusy={pushBusy}
        pushStatusLoading={pushStatusLoading}
        onToggle={(next) => void handlePushToggle(next)}
      />

      {isAdmin ? (
        <AdminProfileTools onError={setError} onPushHint={setPushHint} />
      ) : null}

      <div className="flex justify-center">
        <Button type="submit" disabled={saving || !isDirty}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
