"use client";

import { useEffect, useState } from "react";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { loadGltfFromUrl } from "@/lib/achievements/badge/model/load/load-gltf";

export function useBadgeGltfSource(url: string | null): {
  gltf: GLTF | null;
  error: Error | null;
  isLoading: boolean;
} {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(url));

  useEffect(() => {
    if (!url) {
      setGltf(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setGltf(null);
    setError(null);
    setIsLoading(true);

    void loadGltfFromUrl(url)
      .then((loaded) => {
        if (cancelled) return;
        setGltf(loaded);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError : new Error("Failed to load GLB."));
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { gltf, error, isLoading };
}
