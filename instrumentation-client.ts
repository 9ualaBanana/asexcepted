// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled } from "@/lib/sentry/enabled";
import { getSentryInitOptions } from "@/lib/sentry/init-options";

Sentry.init(getSentryInitOptions());

export const onRouterTransitionStart = isSentryEnabled()
  ? Sentry.captureRouterTransitionStart
  : () => {};
