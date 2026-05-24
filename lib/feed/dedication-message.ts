export function dedicationActivityParts(
  senderName: string,
  achievementTitle: string,
): { sender: string; achievement: string } {
  return {
    sender: senderName.trim() || "Someone",
    achievement: achievementTitle.trim() || "an achievement",
  };
}

/**
 * Canonical dedication copy for push + feed (receiver-facing).
 * Verbatim: "{sender} dedicated {achievement} to u"
 */
export function formatDedicationActivityMessage(
  senderName: string,
  achievementTitle: string,
): string {
  const { sender, achievement } = dedicationActivityParts(
    senderName,
    achievementTitle,
  );
  return `${sender} dedicated ${achievement} to u`;
}