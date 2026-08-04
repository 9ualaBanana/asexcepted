export const ACHIEVEMENT_TONES = [
  "rose",
  "indigo",
  "teal",
  "orange",
  "lime",
  "fuchsia",
] as const;

export type AchievementTone = (typeof ACHIEVEMENT_TONES)[number];

export const DEFAULT_ACHIEVEMENT_TONE: AchievementTone = "teal";

const TONE_SET: ReadonlySet<string> = new Set(ACHIEVEMENT_TONES);

export function parseTone(value?: string | null): AchievementTone {
  if (value && TONE_SET.has(value)) {
    return value as AchievementTone;
  }
  return DEFAULT_ACHIEVEMENT_TONE;
}

export const ACHIEVEMENT_ICON_KEYS = [
  "trophy",
  "medal",
  "star",
  "sparkles",
  "flame",
  "award",
  "rocket",
  "shield",
  "compass",
  "globe",
  "leaf",
  "gem",
  "zap",
  "crown",
  "brain",
  "heart",
  "target",
  "book",
  "camera",
  "palette",
  "orbit",
  "puzzle",
  "waves",
  "sunrise",
  "flag",
  "pen",
  "spiral",
] as const;

export type AchievementIconKey = (typeof ACHIEVEMENT_ICON_KEYS)[number];

export const DEFAULT_ACHIEVEMENT_ICON_KEY: AchievementIconKey = "trophy";

const ICON_KEY_SET: ReadonlySet<string> = new Set(ACHIEVEMENT_ICON_KEYS);

export function parseIconKey(value?: string | null): AchievementIconKey {
  if (value && ICON_KEY_SET.has(value)) {
    return value as AchievementIconKey;
  }
  return DEFAULT_ACHIEVEMENT_ICON_KEY;
}

export type AchievementVisibility = "public" | "private";

export const DEFAULT_ACHIEVEMENT_VISIBILITY: AchievementVisibility = "public";

export function parseVisibility(
  value?: string | null,
): AchievementVisibility {
  return value === "private" ? "private" : DEFAULT_ACHIEVEMENT_VISIBILITY;
}

export type IconAssetKind = "image" | "model_glb";

export const DEFAULT_ICON_ASSET_KIND: IconAssetKind = "image";

export function parseIconAssetKind(
  value?: string | null,
): IconAssetKind {
  return value === "model_glb" ? "model_glb" : DEFAULT_ICON_ASSET_KIND;
}
