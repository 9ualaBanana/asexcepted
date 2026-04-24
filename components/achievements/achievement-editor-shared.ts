import {
  Award,
  BookOpen,
  Brain,
  Camera,
  Compass,
  Crown,
  Flag,
  Flame,
  Gem,
  Globe2,
  Heart,
  Leaf,
  Medal,
  Orbit,
  Palette,
  PenLine,
  Puzzle,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Sunrise,
  Target,
  Trophy,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { type AchievementTone } from "@/components/achievements/achievement-card";

export type AchievementIconKey =
  | "trophy"
  | "medal"
  | "star"
  | "sparkles"
  | "flame"
  | "award"
  | "rocket"
  | "shield"
  | "compass"
  | "globe"
  | "leaf"
  | "gem"
  | "zap"
  | "crown"
  | "brain"
  | "heart"
  | "target"
  | "book"
  | "camera"
  | "palette"
  | "orbit"
  | "puzzle"
  | "waves"
  | "sunrise"
  | "flag"
  | "pen";

export const iconMap: Record<AchievementIconKey, LucideIcon> = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  sparkles: Sparkles,
  flame: Flame,
  award: Award,
  rocket: Rocket,
  shield: Shield,
  compass: Compass,
  globe: Globe2,
  leaf: Leaf,
  gem: Gem,
  zap: Zap,
  crown: Crown,
  brain: Brain,
  heart: Heart,
  target: Target,
  book: BookOpen,
  camera: Camera,
  palette: Palette,
  orbit: Orbit,
  puzzle: Puzzle,
  waves: Waves,
  sunrise: Sunrise,
  flag: Flag,
  pen: PenLine,
};

export function getSafeIconKey(value?: string | null): AchievementIconKey {
  if (value && value in iconMap) {
    return value as AchievementIconKey;
  }
  return "trophy";
}

export function getSafeIcon(value?: string | null): LucideIcon {
  return iconMap[getSafeIconKey(value)];
}

export type FormState = {
  title: string;
  description: string;
  category: string;
  icon: AchievementIconKey;
  iconUrl: string;
  iconFileId: string;
  tone: AchievementTone;
  isLocked: boolean;
  achievedAt: string;
};

export type BadgeIkSession = {
  baselineUrl: string;
  baselineFileId: string;
  lastSessionFileId: string | null;
};

export const EMPTY_BADGE_IK_SESSION: BadgeIkSession = Object.freeze({
  baselineUrl: "",
  baselineFileId: "",
  lastSessionFileId: null as string | null,
});

export function hasMeaningfulContent(form: FormState) {
  return (
    form.title.trim().length > 0 ||
    form.description.trim().length > 0 ||
    form.category.trim().length > 0
  );
}

export function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function formatGridDate(value: string | null) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export function formatAchievedAt(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
