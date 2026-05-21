import { isSentryEnabled } from "@/lib/sentry/enabled";

const SENTRY_DSN =
  "https://4891ce59ec0b8692bcb5b1478a896e3b@o4511337469444096.ingest.de.sentry.io/4511337486811216";

export function getSentryInitOptions() {
  return {
    dsn: SENTRY_DSN,
    enabled: isSentryEnabled(),
    tracesSampleRate: 1,
    enableLogs: true,
    sendDefaultPii: true,
  } as const;
}
