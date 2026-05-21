/**
 * Sentry runs only on Vercel deployments (preview + production), not local dev.
 */
export function isSentryEnabled(): boolean {
  return process.env.VERCEL === "1";
}
