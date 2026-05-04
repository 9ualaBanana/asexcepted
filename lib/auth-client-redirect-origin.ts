/**
 * Base URL for Supabase `emailRedirectTo` / `redirectTo` from client components.
 * Uses the current tab origin so links match preview, staging, production, or local dev.
 */
export function getAuthClientRedirectOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin.replace(/\/$/, "");
}
