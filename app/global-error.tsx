"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

import { AppToaster } from "@/components/toasts/app-toaster";
import { ErrorToastOnce } from "@/components/toasts/error-toast-once";
import { isSentryEnabled } from "@/lib/sentry/enabled";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (isSentryEnabled()) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <AppToaster />
        <ErrorToastOnce
          id="global-error"
          message={error.message || "Something went wrong."}
        />
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
