"use client";

import { Plus, Share } from "lucide-react";

import { APP_DISPLAY_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type AddToHomeScreenInstructionsProps = {
  compact?: boolean;
  className?: string;
};

export function AddToHomeScreenInstructions({
  compact = false,
  className,
}: AddToHomeScreenInstructionsProps) {
  const stepClass = compact
    ? "text-xs leading-snug text-muted-foreground"
    : "text-sm leading-relaxed text-white/78";

  return (
    <ol className={cn("list-none space-y-2 pl-0", className)}>
      <li className={cn("flex gap-2.5", stepClass)}>
        <Share className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <span>
          Tap <strong className="font-medium text-inherit">Share</strong> in Safari
          (square with arrow at the bottom).
        </span>
      </li>
      <li className={cn("flex gap-2.5", stepClass)}>
        <Plus className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <span>
          Choose <strong className="font-medium text-inherit">Add to Home Screen</strong>
          , then tap <strong className="font-medium text-inherit">Add</strong>.
        </span>
      </li>
      <li className={stepClass}>
        Open <strong className="font-medium">{APP_DISPLAY_NAME}</strong> from your home
        screen, go to <strong className="font-medium">Profile</strong>, and turn on
        notifications.
      </li>
    </ol>
  );
}
