import { z } from "zod";

export const ACHIEVEMENT_TONES = [
  "rose",
  "indigo",
  "teal",
  "orange",
  "lime",
  "fuchsia",
] as const;

export const achievementToneSchema = z.enum(ACHIEVEMENT_TONES);

export type AchievementTone = z.infer<typeof achievementToneSchema>;

export const DEFAULT_ACHIEVEMENT_TONE: AchievementTone = "teal";

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

export const achievementIconKeySchema = z.enum(ACHIEVEMENT_ICON_KEYS);

export type AchievementIconKey = z.infer<typeof achievementIconKeySchema>;

export const DEFAULT_ACHIEVEMENT_ICON_KEY: AchievementIconKey = "trophy";

export const ACHIEVEMENT_VISIBILITIES = ["public", "private"] as const;

export const achievementVisibilitySchema = z.enum(ACHIEVEMENT_VISIBILITIES);

export type AchievementVisibility = z.infer<typeof achievementVisibilitySchema>;

export const DEFAULT_ACHIEVEMENT_VISIBILITY: AchievementVisibility = "public";

export const ICON_ASSET_KINDS = ["image", "model_glb"] as const;

export const iconAssetKindSchema = z.enum(ICON_ASSET_KINDS);

export type IconAssetKind = z.infer<typeof iconAssetKindSchema>;

export const DEFAULT_ICON_ASSET_KIND: IconAssetKind = "image";
