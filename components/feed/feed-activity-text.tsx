import type { FeedRow } from "@/lib/feed-db";
import { cn } from "@/lib/utils";

type FeedActivityTextProps = {
  row: FeedRow;
};

const verbClass = "text-[13px] font-normal text-muted-foreground/75";

function ActorName({ children }: { children: string }) {
  return (
    <span className="font-medium text-foreground/88">{children}</span>
  );
}

function AchievementName({
  children,
  impression,
}: {
  children: string;
  impression?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-semibold tracking-tight text-foreground",
        impression && "text-amber-50/95",
      )}
    >
      {children}
    </span>
  );
}

export function FeedActivityText({ row }: FeedActivityTextProps) {
  const title = row.title?.trim() || "Achievement";
  const actor = row.actor_display_name?.trim() || "Someone";
  const isImpression = row.event_type === "impression";

  return (
    <p className="text-sm leading-snug">
      {isImpression ? (
        <>
          <AchievementName impression>{title}</AchievementName>
          <span className={verbClass}> left impression on </span>
          <ActorName>{actor}</ActorName>
        </>
      ) : (
        <>
          <ActorName>{actor}</ActorName>
          <span className={verbClass}> unlocked </span>
          <AchievementName>{title}</AchievementName>
        </>
      )}
    </p>
  );
}
