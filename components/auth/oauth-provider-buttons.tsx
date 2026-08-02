"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import {
  getEnabledOAuthProviders,
  type OAuthButtonIntent,
} from "@/lib/auth/oauth-providers";

type OAuthProviderButtonsProps = {
  next?: string;
  intent?: OAuthButtonIntent;
};

export function OAuthProviderButtons({
  next,
  intent = "sign-in",
}: OAuthProviderButtonsProps) {
  const providers = getEnabledOAuthProviders();

  if (providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {providers.map((p) => {
        if (p.id === "google") {
          return (
            <GoogleSignInButton key={p.id} next={next} intent={intent} />
          );
        }
        return null;
      })}
    </div>
  );
}
