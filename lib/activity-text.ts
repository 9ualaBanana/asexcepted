import type { FeedRow } from "@/lib/feed-db";

export type ActivityTextPart = {
  kind: "actor" | "achievement" | "muted";
  text: string;
};

export type ActivityTextCopy = {
  text: string;
  parts: ActivityTextPart[];
};

export function buildFeedActivityText(
  row: Pick<FeedRow, "event_type" | "actor_display_name" | "title">,
): ActivityTextCopy {
  switch (row.event_type) {
    case "dedication":
      return buildDedicationActivityText(row.title ?? "", row.actor_display_name);
    case "impression":
      return buildImpressionActivityText(row.title ?? "", row.actor_display_name);
    default:
      return buildUnlockActivityText(row.title ?? "", row.actor_display_name);
  }
}

function buildNewInspirationActivityText(
  actor: string,
): ActivityTextCopy {
  return {
    text: `${actor} is now inspired by you`,
    parts: [
      { kind: "actor", text: actor },
      { kind: "muted", text: "is now inspired by you" },
    ],
  };
}

function buildUnlockActivityText(
  achievement: string,
  actor: string,
): ActivityTextCopy {
  return {
    text: `${actor} unlocked ${achievement}`,
    parts: [
      { kind: "actor", text: actor },
      { kind: "muted", text: "unlocked " },
      { kind: "achievement", text: achievement },
    ],
  };
}

function buildImpressionActivityText(
  achievement: string,
  actor: string,
): ActivityTextCopy {
  return {
    text: `${achievement} left impression on ${actor}`,
    parts: [
      { kind: "achievement", text: achievement },
      { kind: "muted", text: "left impression on " },
      { kind: "actor", text: actor },
    ],
  };
}

function buildDedicationActivityText(
  achievement: string,
  actor: string,
): ActivityTextCopy {
  return {
    text: `${actor} dedicated ${achievement} to u`,
    parts: [
      { kind: "actor", text: actor },
      { kind: "muted", text: "dedicated " },
      { kind: "achievement", text: achievement },
      { kind: "muted", text: " to u" },
    ],
  };
}

export function formatNewInspirationActivityMessage(followerName: string): string {
  return buildNewInspirationActivityText(followerName).text;
}

export function formatUnlockActivityMessage(
  achievement: string,
  actor: string,
): string {
  return buildUnlockActivityText(achievement, actor).text;
}

export function formatImpressionActivityMessage(
  achievement: string,
  actor: string,
): string {
  return buildImpressionActivityText(achievement, actor).text;
}

export function formatDedicationActivityMessage(
  achievement: string,
  actor: string,
): string {
  return buildDedicationActivityText(achievement, actor).text;
}
