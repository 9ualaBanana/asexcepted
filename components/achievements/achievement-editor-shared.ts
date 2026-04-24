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

export function createEmptyBadgeIkSession(): BadgeIkSession {
  return {
    baselineUrl: "",
    baselineFileId: "",
    lastSessionFileId: null,
  };
}

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

/** Achievement detail dialog: icon control (close, pen, trash, back, save). */
export const achievementDialogIconBtn =
  "inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50";

/** Max width aligned with overlay badge column (view + edit). */
export const achievementBadgeChromeWidth =
  "mx-auto w-full max-w-[min(92vw,20rem)] sm:max-w-[20rem]";

/** Same horizontal inset from chrome edges for all corner actions. */
export const achievementDialogChromeInset =
  "pl-2 pr-2 sm:pl-3 sm:pr-3";

/** Fixed width for left/right icon slots so a centered middle icon stays true center. */
export const achievementDialogIconSideSlot =
  "flex h-10 w-10 shrink-0 items-center";
