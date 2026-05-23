import type { FeedRow } from "@/lib/feed-db";
import { cn } from "@/lib/utils";

type FeedActivityTextProps = {
  row: FeedRow;
};

function ActorLabel({ children }: { children: string }) {
  return (
    <span className="font-semibold text-foreground">{children}</span>
  );
}

function AchievementLabel({
  children,
  impression,
}: {
  children: string;
  impression?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight",
        impression ? "text-amber-100" : "text-foreground",
      )}
    >
      {children}
    </span>
  );
}

function MutedVerb({ children }: { children: string }) {
  return (
    <span className="font-normal text-muted-foreground/75">{children}</span>
  );
}

/** Compact copy for fixed-height feed rows (truncate with line-clamp). */
export function FeedActivityText({ row }: FeedActivityTextProps) {
  const title = row.title?.trim() || "Achievement";
  const actor = row.actor_display_name?.trim() || "Someone";
  const isImpression = row.event_type === "impression";

  if (isImpression) {
    return (
      <div className="flex min-h-0 min-w-0 flex-col justify-center gap-px overflow-hidden">
        <p className="line-clamp-1 text-[13px] leading-tight">
          <AchievementLabel impression>{title}</AchievementLabel>
        </p>
        <p className="line-clamp-1 text-xs leading-tight">
          <MutedVerb>left impression on </MutedVerb>
          <ActorLabel>{actor}</ActorLabel>
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-col justify-center gap-px overflow-hidden">
      <p className="line-clamp-1 text-xs leading-tight">
        <ActorLabel>{actor}</ActorLabel>
        <MutedVerb> unlocked</MutedVerb>
      </p>
      <p className="line-clamp-1 text-[13px] leading-tight">
        <AchievementLabel>{title}</AchievementLabel>
      </p>
    </div>
  );
}
