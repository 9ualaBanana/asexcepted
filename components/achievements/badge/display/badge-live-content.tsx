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
  const { displaySrc, model, signedModelUrl, motionSeed, float, content } =
    liveVisual;

  const liveContent = useMemo(
    () => (
      <BadgeInteractiveContentLayer
        displaySrc={displaySrc}
        model={model}
        signedModelUrlProp={signedModelUrl}
        motionSeed={motionSeed}
        float={float}
        content={content}
      />
    ),
    [content, displaySrc, float, model, motionSeed, signedModelUrl],
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
