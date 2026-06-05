"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { fetchSignedBadgeModelUrl } from "@/lib/achievements/client/badge-asset";

export function useSignedBadgeModelUrl(
  assetPath: string,
  enabled = true,
  onUrlReady?: () => void,
) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notifyUrlReady = useEffectEvent(() => onUrlReady?.());

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

    void fetchSignedBadgeModelUrl(trimmedPath).then((result) => {
      if (cancelled) return;
      if (result.isOk()) {
        setSignedUrl(result.value);
        setLoading(false);
        notifyUrlReady();
        return;
      }
      setSignedUrl(null);
      setLoading(false);
      setError(result.error);
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
