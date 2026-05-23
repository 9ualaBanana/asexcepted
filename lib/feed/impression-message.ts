/**
 * Shared copy for push + feed when someone leaves an impression on an achievement.
 * Canonical order: "{achievement} left impression on {user}" — do not reorder or rephrase.
 */
export function formatImpressionActivityMessage(
  achievementTitle: string | null | undefined,
  actorDisplayName: string | null | undefined,
): string {
  const title = achievementTitle?.trim() || "Achievement";
  const actor = actorDisplayName?.trim() || "Someone";
  return `${title} left impression on ${actor}`;
}
