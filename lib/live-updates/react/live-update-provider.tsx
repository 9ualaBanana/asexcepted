"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { LiveUpdateDriver } from "@/lib/live-updates/core/types";
import { getDefaultLiveUpdateDriver } from "@/lib/live-updates/get-default-live-update-driver";

const LiveUpdateDriverContext = createContext<LiveUpdateDriver | null>(null);

type LiveUpdateProviderProps = {
  children: ReactNode;
  /** Override transport (tests, future polling driver). */
  driver?: LiveUpdateDriver;
};

export function LiveUpdateProvider({
  children,
  driver,
}: LiveUpdateProviderProps) {
  const value = useMemo(
    () => driver ?? getDefaultLiveUpdateDriver(),
    [driver],
  );

  return (
    <LiveUpdateDriverContext.Provider value={value}>
      {children}
    </LiveUpdateDriverContext.Provider>
  );
}

export function useLiveUpdateDriver(): LiveUpdateDriver {
  const ctx = useContext(LiveUpdateDriverContext);
  return ctx ?? getDefaultLiveUpdateDriver();
}
