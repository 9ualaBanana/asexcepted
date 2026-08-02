import type { SupabaseClient } from "@supabase/supabase-js";
import type { Provider } from "@supabase/supabase-js";

export const OAUTH_PROVIDERS = [
  {
    id: "google",
    signInLabel: "Continue with Google",
    signUpLabel: "Sign up with Google",
    supabaseProvider: "google" as Provider,
    enabled: true,
  },
] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]["id"];

export type OAuthButtonIntent = "sign-in" | "sign-up";

export function getEnabledOAuthProviders() {
  return OAUTH_PROVIDERS.filter((p) => p.enabled);
}

export function hasEnabledOAuthProviders(): boolean {
  return getEnabledOAuthProviders().length > 0;
}

export function oauthProviderButtonLabel(
  id: OAuthProviderId,
  intent: OAuthButtonIntent,
): string {
  const provider = OAUTH_PROVIDERS.find((p) => p.id === id && p.enabled);
  if (!provider) return "Continue";
  return intent === "sign-up" ? provider.signUpLabel : provider.signInLabel;
}

export async function signInWithOAuthProvider(
  supabase: SupabaseClient,
  id: OAuthProviderId,
  redirectTo: string,
) {
  const provider = OAUTH_PROVIDERS.find((p) => p.id === id && p.enabled);
  if (!provider) {
    throw new Error("OAuth provider is not enabled.");
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider.supabaseProvider,
    options: { redirectTo },
  });
  if (error) throw error;
}
