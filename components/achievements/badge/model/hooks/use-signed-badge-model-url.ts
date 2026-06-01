"use client";

import { useEffect, useRef, useState } from "react";

import { fetchSignedBadgeModelUrl } from "@/lib/badge-asset-client";

export function useSignedBadgeModelUrl(
  assetPath: string,
  enabled = true,
  onUrlReady?: () => void,
) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onUrlReadyRef = useRef(onUrlReady);
  onUrlReadyRef.current = onUrlReady;

  useEffect(() => {
    const trimmedPath = assetPath.trim();
    if (!enabled || !trimmedPath) {
      setSignedUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchSignedBadgeModelUrl(trimmedPath)
      .then((url) => {
        if (!cancelled) {
          setSignedUrl(url);
          setLoading(false);
          onUrlReadyRef.current?.();
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setSignedUrl(null);
          setLoading(false);
          setError(nextError instanceof Error ? nextError.message : "Could not load badge model.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assetPath, enabled]);

  return {
    signedUrl,
    loading,
    error,
  };
}
