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

import { SpiralIcon } from "@/components/ui/spiral-icon";
import {
  type AchievementIconKey,
  type AchievementTone,
  type AchievementVisibility,
  type IconAssetKind,
} from "@/lib/achievements/domain/enums";

export type {
  AchievementIconKey,
  AchievementTone,
  AchievementVisibility,
  IconAssetKind,
};

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
  spiral: SpiralIcon as LucideIcon,
};

export type {
  RemoteAssetStorageRef,
  RemoteAssetStorageSession,
} from "@/lib/upload/remote-asset-storage";

export {
  createRemoteAssetStorageRef,
} from "@/lib/upload/remote-asset-storage";

/** Achievement detail dialog: icon control (close, pen, trash, back, save). */
export const achievementDialogIconBtn =
  "inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50";

/** Max width aligned with overlay badge column (view + edit). */
export const badgeChromeWidth =
  "mx-auto w-full max-w-[min(92vw,20rem)] sm:max-w-[20rem]";

/** Same horizontal inset from chrome edges for all corner actions. */
export const achievementDialogChromeInset =
  "pl-2 pr-2 sm:pl-3 sm:pr-3";

/** Fixed width for left/right icon slots so a centered middle icon stays true center. */
export const achievementDialogIconSideSlot =
  "flex h-10 w-10 shrink-0 items-center";
