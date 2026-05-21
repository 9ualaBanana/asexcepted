"use client";

import { cn } from "@/lib/utils";

type TutorialCalloutProps = {
  message: string;
  onDismiss: () => void;
  className?: string;
};

/** Compact floating hint; parent supplies absolute positioning. */
export function TutorialCallout({
  message,
  onDismiss,
  className,
}: TutorialCalloutProps) {
  return (
    <div
      role="status"
      className={cn(
        "relative rounded-md border border-white/18 bg-black/55 px-2.5 py-1.5",
        "text-[10px] leading-snug text-white/65 shadow-md shadow-black/30 backdrop-blur-sm",
        className,
      )}
    >
      <p className="pr-3.5">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss hint"
        className="absolute right-1 top-0.5 text-[11px] leading-none text-white/35 hover:text-white/55"
      >
        ×
      </button>
    </div>
  );
}
