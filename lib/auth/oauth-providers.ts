import type { SupabaseClient } from "@supabase/supabase-js";
import type { Provider } from "@supabase/supabase-js";

export const OAUTH_PROVIDERS = [
  {
    id: "google",
    label: "Continue with Google",
    supabaseProvider: "google" as Provider,
    enabled: false,
  },
] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]["id"];

export function getEnabledOAuthProviders() {
  return OAUTH_PROVIDERS.filter((p) => p.enabled);
}

export function hasEnabledOAuthProviders(): boolean {
  return getEnabledOAuthProviders().length > 0;
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
