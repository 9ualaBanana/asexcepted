import {
  DEFAULT_ACHIEVEMENT_ICON_KEY,
  DEFAULT_ACHIEVEMENT_TONE,
  DEFAULT_ACHIEVEMENT_VISIBILITY,
  DEFAULT_ICON_ASSET_KIND,
  type AchievementIconKey,
  type AchievementTone,
  type AchievementVisibility,
  type IconAssetKind,
} from "@/lib/achievements/domain/enums";

export type FormState = {
  title: string;
  description: string;
  category: string;
  icon: AchievementIconKey;
  iconUrl: string;
  iconFileId: string;
  iconAssetKind: IconAssetKind;
  iconAssetPath: string;
  iconCcAttribution: string;
  iconModelYaw: number;
  iconModelPitch: number;
  iconModelAnimationPlay: boolean;
  iconModelAnimationSpeed: number;
  tone: AchievementTone;
  isLocked: boolean;
  achievedAt: string;
  visibility: AchievementVisibility;
};

export function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function hasMeaningfulContent(form: FormState) {
  return (
    form.title.trim().length > 0 ||
    form.description.trim().length > 0 ||
    form.category.trim().length > 0 ||
    form.iconUrl.trim().length > 0 ||
    form.iconAssetPath.trim().length > 0
  );
}

export function createInitialForm(): FormState {
  return {
    title: "",
    description: "",
    category: "",
    icon: DEFAULT_ACHIEVEMENT_ICON_KEY,
    iconUrl: "",
    iconFileId: "",
    iconAssetKind: DEFAULT_ICON_ASSET_KIND,
    iconAssetPath: "",
    iconCcAttribution: "",
    iconModelYaw: 0,
    iconModelPitch: 0,
    iconModelAnimationPlay: true,
    iconModelAnimationSpeed: 1,
    tone: DEFAULT_ACHIEVEMENT_TONE,
    isLocked: true,
    achievedAt: "",
    visibility: DEFAULT_ACHIEVEMENT_VISIBILITY,
  };
}
