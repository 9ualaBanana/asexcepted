import {
  buildFeedActivityText,
  type ActivityTextPart,
} from "@/lib/notifications/activity-text";
import type { AchievementFeedItemViewModel } from "@/lib/achievements/data/achievement-surface-view-models";
import { cn } from "@/lib/utils";

type FeedActivityTextProps = {
  row: AchievementFeedItemViewModel;
};

export function FeedActivityText({ row }: FeedActivityTextProps) {
  const activity = buildFeedActivityText(row);
  const [firstPart, middlePart, ...lastRowParts] = activity.parts;
  const rows: ActivityTextPart[][] = [
    firstPart ? [firstPart] : [],
    middlePart ? [middlePart] : [],
    lastRowParts,
  ];

  return (
    <div className="grid h-full min-h-0 min-w-0 grid-rows-3 overflow-visible">
      {rows.map((parts, rowIndex) => (
        <p
          key={`${row.eventId}-row-${rowIndex}`}
          className="flex min-h-0 items-center text-xs leading-tight"
        >
          {parts.map((part, partIndex) =>
            renderPart(part, `${row.eventId}-${rowIndex}-${partIndex}`),
          )}
        </p>
      ))}
    </div>
  );
}

function renderPart(
  part: ActivityTextPart,
  key: string,
): React.ReactNode {
  switch (part.kind) {
    case "actor":
      return <ActorLabel key={key}>{part.text}</ActorLabel>;
    case "achievement":
      return (
        <AchievementLabel key={key}>
          {part.text}
        </AchievementLabel>
      );
    default:
      return <MutedVerb key={key}>{part.text}</MutedVerb>;
  }
}

function ActorLabel({ children }: { children: string }) {
  return (
    <span className="font-semibold text-foreground">{children}</span>
  );
}

function AchievementLabel({ children }: { children: string }) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight",
        "text-amber-100",
      )}
    >
      {children}
    </span>
  );
}

function MutedVerb({ children }: { children: string }) {
  return (
    <span className="whitespace-pre-wrap font-normal text-muted-foreground/75">
      {children}
    </span>
  );
}
