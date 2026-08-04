"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/dom/prefers-reduced-motion";

const ENTER_MS = 780;
const EXIT_MS = 500;
const STAGGER_MS = 55;
const STAGGER_SPAN = 3;

const ENTER_CLASS = "bubble-button-enter";
const EXIT_CLASS = "bubble-button-exit";
const PENDING_CLASS = "bubble-button-pending";

type Phase = "hidden" | "enter" | "shown" | "exit" | "exited";

function exitTotalMs(): number {
  return EXIT_MS + STAGGER_MS * STAGGER_SPAN;
}

function motionEnabled(): boolean {
  return !prefersReducedMotion();
}

export type BubbleButtonMotion = {
  className?: string;
  defer: (action: () => void) => void;
  delayStyle: (index: number) => React.CSSProperties | undefined;
};

export function useBubbleButtonMotion(
  active: boolean,
  surfaceKey: string,
): BubbleButtonMotion {
  const enabled = motionEnabled();
  const [phase, setPhase] = React.useState<Phase>("hidden");
  const pendingActionRef = React.useRef<(() => void) | null>(null);
  const phaseRef = React.useRef<Phase>(phase);
  const prevActiveRef = React.useRef(false);
  const prevSurfaceKeyRef = React.useRef(surfaceKey);
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

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!enabled || phase !== "enter") return;
    const t = window.setTimeout(
      () => setPhase("shown"),
      ENTER_MS + STAGGER_MS * STAGGER_SPAN,
    );
    return () => window.clearTimeout(t);
  }, [enabled, phase]);

  React.useEffect(() => {
    if (!enabled || phase !== "exit") return;
    const t = window.setTimeout(() => {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action?.();
      setPhase("exited");
    }, exitTotalMs());
    return () => window.clearTimeout(t);
  }, [enabled, phase]);

  const defer = React.useCallback(
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

  return React.useMemo(() => {
    const motionClass = !enabled
      ? undefined
      : visualPhase === "shown" && active
        ? undefined
        : visualPhase === "exit"
          ? EXIT_CLASS
          : visualPhase === "enter"
            ? ENTER_CLASS
            : PENDING_CLASS;

    return {
      className: motionClass,
      defer,
      delayStyle: (index: number): React.CSSProperties | undefined => {
        if (motionClass !== ENTER_CLASS && motionClass !== EXIT_CLASS) {
          return undefined;
        }
        const order =
          visualPhase === "exit" ? Math.max(STAGGER_SPAN - index, 0) : index;
        return {
          ["--bubble-button-delay" as string]: `${order * STAGGER_MS}ms`,
        };
      },
    };
  }, [active, defer, enabled, visualPhase]);
}

export function bubbleButtonItemProps(
  motion: BubbleButtonMotion | null | undefined,
  index: number,
): { className?: string; style?: React.CSSProperties } {
  if (!motion) return {};
  return {
    className: motion.className,
    style: motion.delayStyle(index),
  };
}

const bubbleButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      emphasis: {
        default: "",
        solid: "bg-white/10 text-white hover:bg-white/15",
      },
    },
    defaultVariants: {
      emphasis: "default",
    },
  },
);

export type BubbleButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof bubbleButtonVariants> & {
    asChild?: boolean;
    motion?: BubbleButtonMotion | null;
    /** Order in the group for staggered enter/exit delay (0 = first). */
    index?: number;
  };

const BubbleButton = React.forwardRef<HTMLButtonElement, BubbleButtonProps>(
  (
    {
      className,
      style,
      asChild = false,
      motion,
      index = 0,
      emphasis,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const item = bubbleButtonItemProps(motion, index);
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(
          bubbleButtonVariants({ emphasis }),
          item.className,
          className,
        )}
        style={{ ...item.style, ...style }}
        {...props}
      />
    );
  },
);
BubbleButton.displayName = "BubbleButton";

export { BubbleButton, bubbleButtonVariants };
