import { Lock } from "lucide-react";

import { type AchievementTone } from "@/components/achievements/achievement-manager-utils";
import {
  getSafeIcon,
  type AchievementIconKey,
} from "@/components/achievements/achievement-editor-shared";
import { cn } from "@/lib/utils";

type FallbackBadgeProps = {
  tone: AchievementTone;
  isLocked: boolean;
  icon: AchievementIconKey;
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

const toneOuterStyles: Record<AchievementTone, string> = {
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

const toneInnerStyles: Record<AchievementTone, string> = {
  rose: "border-rose-200/70 from-rose-200/75 via-rose-100/45 to-white/35 ring-rose-200/35",
  indigo:
    "border-indigo-200/70 from-indigo-200/75 via-indigo-100/45 to-white/35 ring-indigo-200/35",
  teal: "border-teal-200/70 from-teal-200/75 via-teal-100/45 to-white/35 ring-teal-200/35",
  orange:
    "border-orange-200/70 from-orange-200/75 via-orange-100/45 to-white/35 ring-orange-200/35",
  lime: "border-lime-200/70 from-lime-200/75 via-lime-100/45 to-white/35 ring-lime-200/35",
  fuchsia:
    "border-fuchsia-200/70 from-fuchsia-200/75 via-fuchsia-100/45 to-white/35 ring-fuchsia-200/35",
};

const INNER_DISC_PCT = "57.5%";
const ICON_OF_DISC = "62%";

export function FallbackBadge({
  tone,
  isLocked,
  icon,
  className,
}: FallbackBadgeProps) {
  const FallbackIcon = getSafeIcon(icon);

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border",
        isLocked
          ? "border-dashed border-muted-foreground/40 bg-transparent shadow-none"
          : cn(
              "border-solid bg-background/90 bg-gradient-to-br shadow-sm",
              toneOuterStyles[tone],
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
      <div
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full border shadow-sm ring-2 backdrop-blur-sm",
          "bg-gradient-to-br",
          isLocked
            ? "border-white/60 from-white/75 to-white/25 ring-white/20 dark:from-white/20 dark:to-white/5"
            : toneInnerStyles[tone],
        )}
        style={{ width: INNER_DISC_PCT, height: INNER_DISC_PCT }}
      >
        {isLocked ? (
          <Lock
            className="text-foreground/70 dark:text-white/35"
            style={{ width: ICON_OF_DISC, height: ICON_OF_DISC }}
            aria-hidden
          />
        ) : (
          <FallbackIcon
            className="text-foreground/90 dark:text-white/100"
            style={{ width: ICON_OF_DISC, height: ICON_OF_DISC }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
