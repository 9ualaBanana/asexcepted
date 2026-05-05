"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useBadgeDebugOverlayPreference,
} from "@/lib/badge/debug-overlay-preference";

function displayNameFromMetadata(meta: Record<string, unknown> | null | undefined) {
  if (!meta) return "";
  const v =
    meta.display_name ?? meta.full_name ?? meta.name;
  if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

/**
 * Profile fields backed by Supabase Auth `user_metadata` only (single source of truth for display name).
 * Search and social UIs read the same fields from the database via `auth.users` (RPCs), not a duplicate column.
 */
export function ProfileSettings() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [badgeDebugOverlay, setBadgeDebugOverlay] = useBadgeDebugOverlayPreference();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);

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
  }, [supabase]);

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
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
