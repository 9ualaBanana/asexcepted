import { Trophy, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AchievementTone = "gold" | "violet" | "emerald" | "sky";

const toneStyles: Record<AchievementTone, string> = {
  gold:
    "from-amber-300/20 via-amber-200/10 to-transparent border-amber-300/30",
  violet:
    "from-violet-300/20 via-fuchsia-200/10 to-transparent border-violet-300/30",
  emerald:
    "from-emerald-300/20 via-lime-200/10 to-transparent border-emerald-300/30",
  sky: "from-sky-300/20 via-cyan-200/10 to-transparent border-sky-300/30",
};

type AchievementCardProps = {
  description: string;
  title?: string;
  icon?: LucideIcon;
  category?: string;
  awardedAt?: string;
  tone?: AchievementTone;
  className?: string;
};

export function AchievementCard({
  description,
  title,
  icon: Icon = Trophy,
  category,
  awardedAt,
  tone = "gold",
  className,
}: AchievementCardProps) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-card/90 p-5 shadow-sm transition-transform duration-200",
        "hover:-translate-y-1 hover:shadow-lg",
        "flex min-h-52 flex-col justify-between",
        `bg-gradient-to-br ${toneStyles[tone]}`,
        className,
      )}
    >
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

        <div className="rounded-2xl border border-white/30 bg-white/40 p-2.5 text-foreground/80 backdrop-blur-sm dark:bg-white/10">
          <Icon className="h-5 w-5" />
        </div>
      </header>

      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground/90">{description}</p>
        {awardedAt ? (
          <p className="text-xs text-muted-foreground">Awarded {awardedAt}</p>
        ) : null}
      </div>
    </article>
  );
}
