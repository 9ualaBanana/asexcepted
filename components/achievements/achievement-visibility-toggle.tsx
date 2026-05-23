"use client";

import { useCallback, useRef, useState } from "react";

import type { AchievementVisibility } from "@/components/achievements/achievement-editor-shared";
import { cn } from "@/lib/utils";

const PRESS_HOLD_MS = 200;
const RELEASE_MS = 130;

type AchievementVisibilityToggleProps = {
  visibility: AchievementVisibility;
  disabled?: boolean;
  onToggle: (next: AchievementVisibility) => void;
};

export function AchievementVisibilityToggle({
  visibility,
  disabled = false,
  onToggle,
}: AchievementVisibilityToggleProps) {
  const isPublic = visibility === "public";
  const [pressed, setPressed] = useState(false);
  const animatingRef = useRef(false);

  const runPullSwitch = useCallback(async () => {
    if (disabled || animatingRef.current) return;
    animatingRef.current = true;
    setPressed(true);
    await new Promise((resolve) => window.setTimeout(resolve, PRESS_HOLD_MS));
    onToggle(isPublic ? "private" : "public");
    await new Promise((resolve) => window.setTimeout(resolve, RELEASE_MS));
    setPressed(false);
    animatingRef.current = false;
  }, [disabled, isPublic, onToggle]);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={!isPublic}
      aria-label={
        isPublic
          ? "Visibility public. Press to make private."
          : "Visibility private. Press to make public."
      }
      className={cn(
        "achievement-visibility-pull min-w-[5.25rem] select-none px-3 py-1.5",
        "text-[10.5px] font-semibold uppercase tracking-[0.14em]",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
        "disabled:pointer-events-none disabled:opacity-50",
        isPublic ? "text-white" : "text-white/40",
        pressed && "achievement-visibility-pull-pressed",
      )}
      style={{ transformStyle: "preserve-3d" }}
      onClick={() => void runPullSwitch()}
    >
      {isPublic ? "public" : "private"}
    </button>
  );
}
