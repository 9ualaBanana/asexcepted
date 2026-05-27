"use client";

import type { ReactNode } from "react";
import { CheckCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type TutorialToastProps = {
  message?: string;
  children?: ReactNode;
  onDismiss: () => void;
  visible?: boolean;
  className?: string;
};

export function TutorialToast({
  message,
  children,
  onDismiss,
  visible = true,
  className,
}: TutorialToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-[1.15rem] border border-white/12",
        className,
        "bg-[rgba(20,18,28,0.94)] px-4 py-3 text-left text-white shadow-[0_14px_40px_rgba(0,0,0,0.34)] backdrop-blur-md",
        "transition-all duration-200 ease-out",
        visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
      )}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss tutorial"
        className="mt-0.5 shrink-0 rounded-full p-1 text-white/38 transition hover:bg-white/6 hover:text-white/68"
      >
        <CheckCircle className="h-4 w-4" aria-hidden />
      </button>
      <div className="min-w-0 flex-1 pr-1.5">
        {children ?? (
          <p className="mt-1 text-sm leading-relaxed text-white/82">{message}</p>
        )}
      </div>
    </div>
  );
}
