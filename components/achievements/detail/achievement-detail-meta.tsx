import { formatAchievedAt } from "@/components/achievements/achievement-editor-shared";
import { cn } from "@/lib/utils";

type AchievementDetailMetaProps = {
  achievedAt?: string | null;
  category?: string | null;
  className?: string;
  description?: string | null;
  title?: string | null;
};

export function AchievementDetailMeta({
  achievedAt,
  category,
  className,
  description,
  title,
}: AchievementDetailMetaProps) {
  const categoryLabel = category?.trim() ?? "";
  const titleLabel = title?.trim() ?? "";
  const descriptionLabel = description?.trim() ?? "";
  const achievedAtLabel = formatAchievedAt(achievedAt ?? null);

  return (
    <div className={cn("w-full", className)}>
      {categoryLabel ? (
        <p className="mt-8 w-full text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
          {categoryLabel}
        </p>
      ) : null}
      {titleLabel ? (
        <h2
          className={cn(
            "text-center text-xl font-semibold tracking-tight text-white",
            categoryLabel ? "mt-2" : "mt-8",
          )}
        >
          {titleLabel}
        </h2>
      ) : null}
      {descriptionLabel ? (
        <p className="mt-4 break-words text-center text-sm leading-relaxed text-white/65">
          {descriptionLabel}
        </p>
      ) : null}
      {achievedAtLabel ? (
        <p className="mt-4 text-center text-xs text-white/40">{achievedAtLabel}</p>
      ) : null}
    </div>
  );
}

