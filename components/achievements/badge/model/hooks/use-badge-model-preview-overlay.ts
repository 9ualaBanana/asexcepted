"use client";

import { useCallback, useEffect, useState } from "react";

export function useBadgeModelPreviewOverlay(args: {
  signedModelUrl: string;
  showPreviewOverlay: boolean;
  onVisualReady?: () => void;
}) {
  const { signedModelUrl, showPreviewOverlay, onVisualReady } = args;
  const [ready, setReady] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(true);

  useEffect(() => {
    setReady(false);
    setPreviewVisible(true);
  }, [signedModelUrl]);

  const handleVisualReady = useCallback(() => {
    setReady(true);
    onVisualReady?.();
    if (showPreviewOverlay) {
      window.setTimeout(() => {
        setPreviewVisible(false);
      }, 90);
    } else {
      setPreviewVisible(false);
    }
  }, [onVisualReady, showPreviewOverlay]);

  const handleLoadError = useCallback(() => {
    setReady(false);
    setPreviewVisible(true);
  }, []);

  return {
    ready,
    previewVisible,
    handleVisualReady,
    handleLoadError,
  };
}
