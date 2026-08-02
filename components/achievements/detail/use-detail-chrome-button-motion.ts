"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  DETAIL_CHROME_BUTTON_STAGGER_MS,
  DETAIL_CHROME_BUTTON_STAGGER_SPAN,
  DETAIL_CHROME_BUTTON_ENTER_MS,
  detailChromeButtonExitTotalMs,
  isDetailChromeButtonMotionEnabled,
} from "@/lib/achievements/ui/detail-chrome-button-motion";

const ENTER_MOTION_CLASS = "detail-chrome-button-enter-motion";
const EXIT_MOTION_CLASS = "detail-chrome-button-exit-motion";
const PENDING_MOTION_CLASS = "detail-chrome-button-motion-pending";

type Phase = "hidden" | "enter" | "shown" | "exit" | "exited";

/**
 * Presentation-only chrome icon enter/exit. Gate in lib module.
 * `defer(action)` plays exit, then runs action (mode switch / close).
 * Surface key changes (save / discard → view) also restart enter.
 */
export function useDetailChromeButtonMotion(active: boolean, surfaceKey: string) {
  const enabled = isDetailChromeButtonMotionEnabled();
  const [phase, setPhase] = useState<Phase>("hidden");
  const pendingActionRef = useRef<(() => void) | null>(null);
  const phaseRef = useRef<Phase>(phase);
  const prevActiveRef = useRef(false);
  const prevSurfaceKeyRef = useRef(surfaceKey);
  phaseRef.current = phase;

  const surfaceChangedRender = prevSurfaceKeyRef.current !== surfaceKey;
  const visualPhase: Phase =
    active &&
    enabled &&
    surfaceChangedRender &&
    phase !== "exit" &&
    phase !== "enter"
      ? "enter"
      : phase;

  useEffect(() => {
    if (!enabled) {
      setPhase(active ? "shown" : "hidden");
      pendingActionRef.current = null;
      prevActiveRef.current = active;
      prevSurfaceKeyRef.current = surfaceKey;
      return;
    }

    if (!active) {
      setPhase("hidden");
      pendingActionRef.current = null;
      prevActiveRef.current = false;
      prevSurfaceKeyRef.current = surfaceKey;
      return;
    }

    const becameActive = !prevActiveRef.current;
    const surfaceChanged = prevSurfaceKeyRef.current !== surfaceKey;
    prevActiveRef.current = true;
    prevSurfaceKeyRef.current = surfaceKey;

    if (phase === "exit") return;

    if ((becameActive || surfaceChanged) && phase !== "enter") {
      setPhase("enter");
    }
  }, [active, enabled, phase, surfaceKey]);

  useEffect(() => {
    if (!enabled || phase !== "enter") return;
    const t = window.setTimeout(
      () => setPhase("shown"),
      DETAIL_CHROME_BUTTON_ENTER_MS +
        DETAIL_CHROME_BUTTON_STAGGER_MS * DETAIL_CHROME_BUTTON_STAGGER_SPAN,
    );
    return () => window.clearTimeout(t);
  }, [enabled, phase]);

  useEffect(() => {
    if (!enabled || phase !== "exit") return;
    const t = window.setTimeout(() => {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action?.();
      setPhase("exited");
    }, detailChromeButtonExitTotalMs());
    return () => window.clearTimeout(t);
  }, [enabled, phase]);

  const defer = useCallback(
    (action: () => void) => {
      if (!enabled || !active || phaseRef.current === "hidden") {
        action();
        return;
      }
      if (phaseRef.current === "exit" || phaseRef.current === "exited") return;
      pendingActionRef.current = action;
      setPhase("exit");
    },
    [active, enabled],
  );

  return useMemo(() => {
    const motionClass = !enabled
      ? undefined
      : visualPhase === "shown" && active
        ? undefined
        : visualPhase === "exit"
          ? EXIT_MOTION_CLASS
          : visualPhase === "enter"
            ? ENTER_MOTION_CLASS
            : PENDING_MOTION_CLASS;

    return {
      className: motionClass,
      defer,
      delayStyle: (step: number): CSSProperties | undefined => {
        if (
          motionClass !== ENTER_MOTION_CLASS &&
          motionClass !== EXIT_MOTION_CLASS
        ) {
          return undefined;
        }
        const order =
          visualPhase === "exit"
            ? Math.max(DETAIL_CHROME_BUTTON_STAGGER_SPAN - step, 0)
            : step;
        return {
          ["--detail-chrome-button-delay" as string]: `${
            order * DETAIL_CHROME_BUTTON_STAGGER_MS
          }ms`,
        };
      },
    };
  }, [active, defer, enabled, visualPhase]);
}
