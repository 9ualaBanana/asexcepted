import { Trophy, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AchievementTone =
  | "rose"
  | "indigo"
  | "teal"
  | "orange"
  | "lime"
  | "fuchsia";

export const achievementToneStyles: Record<AchievementTone, string> = {
  rose: "from-rose-300/20 via-pink-200/10 to-transparent border-rose-300/30",
  indigo:
    "from-indigo-300/20 via-blue-200/10 to-transparent border-indigo-300/30",
  teal: "from-teal-300/20 via-cyan-200/10 to-transparent border-teal-300/30",
  orange:
    "from-orange-300/20 via-amber-200/10 to-transparent border-orange-300/30",
  lime: "from-lime-300/20 via-emerald-200/10 to-transparent border-lime-300/30",
  fuchsia:
    "from-fuchsia-300/20 via-pink-200/10 to-transparent border-fuchsia-300/30",
};

export const achievementToneSwatches: Record<AchievementTone, string> = {
  rose: "bg-rose-400",
  indigo: "bg-indigo-400",
  teal: "bg-teal-400",
  orange: "bg-orange-400",
  lime: "bg-lime-400",
  fuchsia: "bg-fuchsia-400",
};

export function getSafeTone(value?: string | null): AchievementTone {
  if (value && value in achievementToneStyles) {
    return value as AchievementTone;
  }
  return "teal";
}

type AchievementCardProps = {
  description?: string | null;
  title?: string;
  icon?: LucideIcon;
  category?: string;
  awardedAt?: string;
  tone?: AchievementTone;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function AchievementCard({
  description,
  title,
  icon: Icon = Trophy,
  category,
  awardedAt,
  tone = "teal",
  action,
  footer,
  className,
  onClick,
}: AchievementCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-background/90 p-5 shadow-sm transition-transform duration-200",
        "hover:-translate-y-1 hover:shadow-lg",
        "flex min-h-52 flex-col justify-between",
        onClick ? "cursor-pointer" : "",
        `bg-gradient-to-br ${achievementToneStyles[tone]}`,
        className,
      )}
    >
      {action ? <div className="absolute left-3 top-3 z-20">{action}</div> : null}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/20 blur-2xl"
      />

      <header className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          {category ? (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {category}
            </p>
          ) : null}
          {title ? (
            <h3 className="text-lg font-semibold leading-tight text-foreground">
              {title}
            </h3>
          ) : null}
        </div>

        <div className="rounded-full border border-white/60 bg-gradient-to-br from-white/75 to-white/25 p-2.5 text-foreground/90 shadow-sm ring-2 ring-white/20 backdrop-blur-sm dark:from-white/20 dark:to-white/5">
          <Icon className="h-5 w-5" />
        </div>
      </header>

      <div className="space-y-3">
        {description ? (
          <p className="text-sm leading-relaxed text-foreground/90">{description}</p>
        ) : null
        }
        {awardedAt ? (
          <p className="text-xs text-muted-foreground">{awardedAt}</p>
        ) : null}
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </article>
  );
}
