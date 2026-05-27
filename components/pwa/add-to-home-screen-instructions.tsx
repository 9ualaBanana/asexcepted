"use client";

import { Plus, Share, Smartphone } from "lucide-react";

import { APP_DISPLAY_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type AddToHomeScreenInstallBlockProps = {
  className?: string;
  /**
   * `profile` — settings card colors.
   * `tutorial` — same layout/copy, tuned for tutorial toast on dark glass.
   */
  variant?: "profile" | "tutorial";
};

function instructionStepClass(variant: "profile" | "tutorial"): string {
  return variant === "tutorial"
    ? "text-xs leading-snug text-white/68"
    : "text-xs leading-snug text-muted-foreground";
}

function instructionTitleClass(variant: "profile" | "tutorial"): string {
  return variant === "tutorial"
    ? "text-left text-xs font-medium leading-snug text-white/88"
    : "text-left text-xs font-medium leading-snug text-foreground";
}

function instructionIconClass(variant: "profile" | "tutorial"): string {
  return variant === "tutorial"
    ? "mt-0.5 h-5 w-5 shrink-0 text-white/55"
    : "mt-0.5 h-5 w-5 shrink-0 text-muted-foreground";
}

function instructionShellClass(variant: "profile" | "tutorial"): string {
  return variant === "tutorial"
    ? "space-y-3 rounded-md border border-white/12 bg-white/[0.06] p-3"
    : "space-y-3 rounded-md border border-border/50 bg-muted/30 p-3";
}

/** Shared “add to home screen” prompt: icon, title, and Safari steps. */
export function AddToHomeScreenInstallBlock({
  className,
  variant = "profile",
}: AddToHomeScreenInstallBlockProps) {
  const stepClass = instructionStepClass(variant);
  const strongClass =
    variant === "tutorial" ? "font-medium text-white/82" : "font-medium text-inherit";

  return (
    <div className={cn(instructionShellClass(variant), className)}>
      <div className="flex items-start gap-2.5">
        <Smartphone className={instructionIconClass(variant)} aria-hidden />
        <p className={instructionTitleClass(variant)}>
          Add the app to your home screen to enable notifications
        </p>
      </div>
      <ol className="list-none space-y-2 pl-0 text-left">
        <li className={cn("flex gap-2.5", stepClass)}>
          <Share className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
          <span>
            Tap <strong className={strongClass}>Share</strong> in Safari (square with arrow
            at the bottom).
          </span>
        </li>
        <li className={cn("flex gap-2.5", stepClass)}>
          <Plus className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
          <span>
            Choose <strong className={strongClass}>Add to Home Screen</strong>, then tap{" "}
            <strong className={strongClass}>Add</strong>.
          </span>
        </li>
        <li className={stepClass}>
          Open <strong className={strongClass}>{APP_DISPLAY_NAME}</strong> from your home
          screen, go to <strong className={strongClass}>Profile</strong>, and turn on
          notifications.
        </li>
      </ol>
    </div>
  );
}

/** @deprecated Use {@link AddToHomeScreenInstallBlock}. */
export function AddToHomeScreenInstructions(props: {
  compact?: boolean;
  className?: string;
}) {
  return <AddToHomeScreenInstallBlock className={props.className} variant="profile" />;
}
