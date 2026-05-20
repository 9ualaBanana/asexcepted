"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getEnabledOAuthProviders,
  signInWithOAuthProvider,
  type OAuthProviderId,
} from "@/lib/auth/oauth-providers";
import { authCallbackUrl } from "@/lib/routes";
import { Button } from "@/components/ui/button";

type OAuthProviderButtonsProps = {
  next?: string;
};

export function OAuthProviderButtons({ next }: OAuthProviderButtonsProps) {
  const [busy, setBusy] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const providers = getEnabledOAuthProviders();

  if (providers.length === 0) return null;

  async function handleOAuth(id: OAuthProviderId) {
    setBusy(id);
    setError(null);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const redirectTo = authCallbackUrl(origin, next);
      await signInWithOAuthProvider(supabase, id, redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start sign in.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {providers.map((p) => (
        <Button
          key={p.id}
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy !== null}
          onClick={() => void handleOAuth(p.id)}
        >
          {busy === p.id ? "Redirecting…" : p.label}
        </Button>
      ))}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
