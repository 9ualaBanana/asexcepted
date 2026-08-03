import type { User } from "@supabase/supabase-js";

export function isEmailOnlyAuthUser(user: User): boolean {
  const identityProviders = (user.identities ?? [])
    .map((identity) => identity.provider)
    .filter((provider): provider is string => Boolean(provider));

  if (identityProviders.length > 0) {
    return identityProviders.every((provider) => provider === "email");
  }

  const metaProviders = user.app_metadata?.providers;
  if (Array.isArray(metaProviders) && metaProviders.length > 0) {
    return metaProviders.every((provider) => provider === "email");
  }

  return user.app_metadata?.provider === "email";
}
