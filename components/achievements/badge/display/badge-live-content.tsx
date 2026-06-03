"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { BadgeInteractiveContentLayer } from "@/components/achievements/badge/display/badge-interactive-content-layer";
import type { BadgeLiveVisual } from "@/components/achievements/badge/display/badge-options";

const BadgeLiveContentContext = createContext<ReactNode | null>(null);

type BadgeLiveContentProviderProps = {
  liveVisual: BadgeLiveVisual;
  children: ReactNode;
};

/** Single memoized live art subtree shared by underlay and unlock reveal. */
export function BadgeLiveContentProvider({
  liveVisual,
  children,
}: BadgeLiveContentProviderProps) {
  const liveContent = useMemo(
    () => (
      <BadgeInteractiveContentLayer
        displaySrc={liveVisual.displaySrc}
        model={liveVisual.model}
        signedModelUrlProp={liveVisual.signedModelUrl}
        motionSeed={liveVisual.motionSeed}
        float={liveVisual.float}
        content={liveVisual.content}
      />
    ),
    [
      liveVisual.content,
      liveVisual.displaySrc,
      liveVisual.float,
      liveVisual.model,
      liveVisual.motionSeed,
      liveVisual.signedModelUrl,
    ],
  );

  return (
    <BadgeLiveContentContext.Provider value={liveContent}>
      {children}
    </BadgeLiveContentContext.Provider>
  );
}

export function useBadgeLiveContent(): ReactNode {
  const liveContent = useContext(BadgeLiveContentContext);
  if (liveContent === null) {
    throw new Error(
      "useBadgeLiveContent must be used within BadgeLiveContentProvider",
    );
  }
  return liveContent;
}
