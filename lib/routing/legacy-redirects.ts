/**
 * Permanent redirects for retired product paths.
 * Shared by next.config and regression tests so redirs cannot drift from code.
 */
export type LegacyRedirect = {
  source: string;
  destination: string;
  permanent: boolean;
};

export const LEGACY_REDIRECTS = [
  { source: "/achievements", destination: "/inspa", permanent: true },
  { source: "/achievements/:path*", destination: "/inspa", permanent: true },
  { source: "/friends", destination: "/inspa", permanent: true },
  { source: "/friends/:path*", destination: "/inspa", permanent: true },
  { source: "/social", destination: "/inspa", permanent: true },
  { source: "/social/:path*", destination: "/inspa", permanent: true },
  { source: "/auth/sign-up", destination: "/auth/login", permanent: true },
  {
    source: "/auth/sign-up-success",
    destination: "/auth/login",
    permanent: true,
  },
] as const satisfies readonly LegacyRedirect[];

/** Paths retired from ROUTES — must never reappear as live app destinations. */
export const RETIRED_ROUTE_SEGMENTS = [
  "/achievements",
  "/friends",
  "/social",
  "/auth/sign-up",
  "/auth/sign-up-success",
] as const;
