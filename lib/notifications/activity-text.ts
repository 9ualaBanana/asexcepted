import type { AchievementFeedItemViewModel } from "@/lib/achievements/presentation/surface-view-models";
import { clampNickname } from "@/lib/ui/dynamic-text";

export type ActivityTextPart = {
  kind: "actor" | "achievement" | "muted";
  text: string;
};

export type ActivityTextCopy = {
  text: string;
  parts: ActivityTextPart[];
};

export function buildFeedActivityText(
  row: Pick<AchievementFeedItemViewModel, "eventType" | "actorDisplayName" | "title">,
): ActivityTextCopy {
  switch (row.eventType) {
    case "dedication":
      return buildDedicationActivityText(row.title ?? "", row.actorDisplayName);
    case "impression":
      return buildImpressionActivityText(row.title ?? "", row.actorDisplayName);
    default:
      return buildUnlockActivityText(row.title ?? "", row.actorDisplayName);
  }
}

function buildNewInspirationActivityText(
  actor: string,
): ActivityTextCopy {
  const name = clampNickname(actor);
  return {
    text: `${name} is now inspired by you`,
    parts: [
      { kind: "actor", text: name },
      { kind: "muted", text: "is now inspired by you" },
    ],
  };
}

function buildUnlockActivityText(
  achievement: string,
  actor: string,
): ActivityTextCopy {
  const name = clampNickname(actor);
  return {
    text: `${name} unlocked ${achievement}`,
    parts: [
      { kind: "actor", text: name },
      { kind: "muted", text: "unlocked " },
      { kind: "achievement", text: achievement },
    ],
  };
}

function buildImpressionActivityText(
  achievement: string,
  actor: string,
): ActivityTextCopy {
  const name = clampNickname(actor);
  return {
    text: `${achievement} left impression on ${name}`,
    parts: [
      { kind: "achievement", text: achievement },
      { kind: "muted", text: "left impression on " },
      { kind: "actor", text: name },
    ],
  };
}

function buildDedicationActivityText(
  achievement: string,
  actor: string,
): ActivityTextCopy {
  const name = clampNickname(actor);
  return {
    text: `${name} dedicated ${achievement} to u`,
    parts: [
      { kind: "actor", text: name },
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

function buildDedicationAcceptedActivityText(
  achievement: string,
  recipientName: string,
): ActivityTextCopy {
  const name = clampNickname(recipientName);
  return {
    text: `${name} added ${achievement} to their collection`,
    parts: [
      { kind: "actor", text: name },
      { kind: "muted", text: " added " },
      { kind: "achievement", text: achievement },
      { kind: "muted", text: " to their collection" },
    ],
  };
}

export function formatDedicationAcceptedActivityMessage(
  achievement: string,
  recipientName: string,
): string {
  return buildDedicationAcceptedActivityText(achievement, recipientName).text;
}
