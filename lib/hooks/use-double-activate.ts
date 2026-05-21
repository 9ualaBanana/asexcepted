"use client";

import { useCallback, useRef } from "react";

const DEFAULT_MAX_INTERVAL_MS = 400;

type UseDoubleActivateOptions = {
  onActivate: () => void;
  disabled?: boolean;
  maxIntervalMs?: number;
};

export function useDoubleActivate({
  onActivate,
  disabled = false,
  maxIntervalMs = DEFAULT_MAX_INTERVAL_MS,
}: UseDoubleActivateOptions) {
  const lastTapRef = useRef(0);

  const onDoubleClick = useCallback(() => {
    if (disabled) return;
    onActivate();
  }, [disabled, onActivate]);

  const onPointerUp = useCallback(() => {
    if (disabled) return;
    const now = Date.now();
    if (now - lastTapRef.current <= maxIntervalMs) {
      lastTapRef.current = 0;
      onActivate();
      return;
    }
    lastTapRef.current = now;
  }, [disabled, maxIntervalMs, onActivate]);

  return { onDoubleClick, onPointerUp };
}
