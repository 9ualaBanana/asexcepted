"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

const HIDDEN_REVEAL_CLIP = "circle(0% at 50% 50%)";

type UnlockRevealWaveProps = {
  isUnlocking: boolean;
  detailMaskStyle: CSSProperties | null;
  clipPathRef: RefObject<string>;
  reveal: ReactNode;
};

/** Clipped overlay of unlocked badge art; clip-path is painted from a ref (no React state). */
export function UnlockRevealWave({
  isUnlocking,
  detailMaskStyle,
  clipPathRef,
  reveal,
}: UnlockRevealWaveProps) {
  const hostRef = useRafSyncedClipPath(isUnlocking, clipPathRef);

  if (!isUnlocking) return null;

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 z-[18] pointer-events-none"
      style={{
        ...(detailMaskStyle ?? {}),
        clipPath: clipPathRef.current,
      }}
    >
      {reveal}
    </div>
  );
}

/** While active, copy `clipPathRef.current` onto the host every animation frame. */
function useRafSyncedClipPath(
  active: boolean,
  clipPathRef: RefObject<string>,
) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    const paint = () => {
      const host = hostRef.current;
      if (host) host.style.clipPath = clipPathRef.current;
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [active, clipPathRef]);

  return hostRef;
}

type RevealClipPathDriver = {
  clipPathRef: RefObject<string>;
  progressRef: RefObject<number>;
  setProgress: (progress: number) => void;
  reset: () => void;
};

type BuildRevealClipPath = (progress: number) => string;

/**
 * Owns reveal progress + CSS clip-path in refs so the unlock animation can
 * advance without setState (which would re-render the whole Badge tree).
 */
export function useRevealClipPathDriver(
  buildClipPath: BuildRevealClipPath | null,
): RevealClipPathDriver {
  const clipPathRef = useRef(HIDDEN_REVEAL_CLIP);
  const progressRef = useRef(0);

  const setProgress = useCallback(
    (progress: number) => {
      progressRef.current = progress;
      clipPathRef.current = buildClipPath
        ? buildClipPath(progress)
        : buildFallbackRevealClipPath(progress);
    },
    [buildClipPath],
  );

  const reset = useCallback(() => {
    setProgress(0);
  }, [setProgress]);

  return useMemo(
    () => ({ clipPathRef, progressRef, setProgress, reset }),
    [reset, setProgress],
  );
}

function buildFallbackRevealClipPath(progress: number) {
  return `circle(${(progress * 120).toFixed(2)}% at 50% 50%)`;
}
