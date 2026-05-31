import { Lock, type LucideIcon } from "lucide-react";

import {
  AchievementBadgeIconDisc,
  achievementBadgeIconDiscSizeStyles,
} from "@/components/achievements/badge/chrome/achievement-badge-icon-disc";
import {
  type AchievementTone,
} from "@/components/achievements/achievement-card";
import { cn } from "@/lib/utils";

type AchievementFallbackBadgeProps = {
  tone: AchievementTone;
  isLocked: boolean;
  FallbackIcon: LucideIcon;
  size?: "grid" | "detail";
  className?: string;
};

const toneGlowStyles: Record<AchievementTone, string> = {
  rose: "bg-[radial-gradient(ellipse_at_72%_26%,rgba(253,164,175,0.24)_0%,rgba(253,164,175,0.15)_24%,rgba(253,164,175,0.09)_46%,rgba(253,164,175,0.04)_68%,rgba(253,164,175,0.015)_84%,rgba(253,164,175,0)_100%)]",
  indigo:
    "bg-[radial-gradient(ellipse_at_72%_26%,rgba(165,180,252,0.24)_0%,rgba(165,180,252,0.15)_24%,rgba(165,180,252,0.09)_46%,rgba(165,180,252,0.04)_68%,rgba(165,180,252,0.015)_84%,rgba(165,180,252,0)_100%)]",
  teal: "bg-[radial-gradient(ellipse_at_72%_26%,rgba(94,234,212,0.24)_0%,rgba(94,234,212,0.15)_24%,rgba(94,234,212,0.09)_46%,rgba(94,234,212,0.04)_68%,rgba(94,234,212,0.015)_84%,rgba(94,234,212,0)_100%)]",
  orange:
    "bg-[radial-gradient(ellipse_at_72%_26%,rgba(253,186,116,0.24)_0%,rgba(253,186,116,0.15)_24%,rgba(253,186,116,0.09)_46%,rgba(253,186,116,0.04)_68%,rgba(253,186,116,0.015)_84%,rgba(253,186,116,0)_100%)]",
  lime: "bg-[radial-gradient(ellipse_at_72%_26%,rgba(190,242,100,0.24)_0%,rgba(190,242,100,0.15)_24%,rgba(190,242,100,0.09)_46%,rgba(190,242,100,0.04)_68%,rgba(190,242,100,0.015)_84%,rgba(190,242,100,0)_100%)]",
  fuchsia:
    "bg-[radial-gradient(ellipse_at_72%_26%,rgba(240,171,252,0.24)_0%,rgba(240,171,252,0.15)_24%,rgba(240,171,252,0.09)_46%,rgba(240,171,252,0.04)_68%,rgba(240,171,252,0.015)_84%,rgba(240,171,252,0)_100%)]",
};

const toneDiscStyles: Record<AchievementTone, string> = {
  rose: "from-rose-300/35 via-pink-200/18 to-background/30 border-rose-300/45",
  indigo:
    "from-indigo-300/35 via-blue-200/18 to-background/30 border-indigo-300/45",
  teal: "from-teal-300/35 via-cyan-200/18 to-background/30 border-teal-300/45",
  orange:
    "from-orange-300/35 via-amber-200/18 to-background/30 border-orange-300/45",
  lime: "from-lime-300/35 via-emerald-200/18 to-background/30 border-lime-300/45",
  fuchsia:
    "from-fuchsia-300/35 via-pink-200/18 to-background/30 border-fuchsia-300/45",
};

export function AchievementFallbackBadge({
  tone,
  isLocked,
  FallbackIcon,
  size = "grid",
  className,
}: AchievementFallbackBadgeProps) {
  const s = achievementBadgeIconDiscSizeStyles[size];

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border",
        isLocked
          ? "border-dashed border-muted-foreground/40 bg-transparent shadow-none"
          : cn(
              "border-solid bg-background/90 bg-gradient-to-br shadow-sm",
              toneDiscStyles[tone],
            ),
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full",
          isLocked
            ? "bg-[radial-gradient(ellipse_at_74%_24%,rgba(255,255,255,0.17)_0%,rgba(255,255,255,0.1)_22%,rgba(255,255,255,0.055)_44%,rgba(255,255,255,0.026)_64%,rgba(255,255,255,0.01)_82%,rgba(255,255,255,0)_100%)]"
            : toneGlowStyles[tone],
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full",
          "bg-[radial-gradient(ellipse_at_30%_72%,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_58%)]",
        )}
      />
      <AchievementBadgeIconDisc size={size} tone={isLocked ? undefined : tone}>
        {isLocked ? (
          <Lock
            className={cn(
              "text-foreground/70 dark:text-white/65",
              s.iconLocked,
            )}
            aria-hidden
          />
        ) : (
          <FallbackIcon
            className={cn(
              "text-foreground/90 dark:text-white/90",
              s.iconUnlocked,
            )}
            aria-hidden
          />
        )}
      </AchievementBadgeIconDisc>
    </div>
  );
}
