import { Sparkles, type LucideIcon } from "lucide-react";

import {
  AchievementGridItem,
  AchievementGridItemFallback,
} from "@/components/achievements/achievement-grid-item";
import type { AchievementTone } from "@/components/achievements/achievement-card";
import { cn } from "@/lib/utils";

type AchievementGridEntry = {
  id: string;
  title: string | null;
  dateLabel: string | null;
  iconUrl: string | null;
  FallbackIcon: LucideIcon;
  tone: AchievementTone;
  isLocked: boolean;
};

type AchievementGridProps = {
  isLoading: boolean;
  readOnly: boolean;
  items: AchievementGridEntry[];
  onAddAchievement: () => void;
  onSelectAchievement: (id: string) => void;
};

const SKELETON_CELL_COUNT = 18;

function AchievementGridFallback() {
  return (
    <div className="space-y-4">
      <div
        className={cn(
          "-mx-2 flex min-h-[calc(100dvh-9.5rem)] flex-col rounded-none bg-background px-2 py-6",
          "sm:mx-0 sm:min-h-[calc(100dvh-10rem)] sm:rounded-2xl sm:px-4",
        )}
      >
        <div className="grid flex-1 grid-cols-3 content-start gap-x-2 gap-y-8">
          {Array.from({ length: SKELETON_CELL_COUNT }, (_, i) => (
            <AchievementGridItemFallback key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AchievementGridInner({
  readOnly,
  items,
  onAddAchievement,
  onSelectAchievement,
}: Omit<AchievementGridProps, "isLoading">) {
  return (
    <div className="space-y-4">
      <div
        className={cn(
          "-mx-2 min-h-[200px] rounded-none bg-background px-2 py-6",
          "sm:mx-0 sm:rounded-2xl sm:px-4",
        )}
      >
        <div className="grid grid-cols-3 gap-x-2 gap-y-8">
          {!readOnly ? (
            <button
              type="button"
              className={cn(
                "no-tap-highlight group flex w-full flex-col items-center gap-1.5 px-0.5 py-1 text-center outline-none transition-opacity",
                "text-white/45 hover:text-white/80",
                "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              onClick={onAddAchievement}
            >
              <div
                className={cn(
                  "relative flex aspect-square w-full max-w-[104px] items-center justify-center rounded-3xl",
                  "border border-dashed border-white/25 bg-transparent transition-colors",
                  "group-hover:border-white/45 group-hover:bg-white/[0.04]",
                )}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-current/40">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
              <p className="line-clamp-2 h-[2.7em] max-h-[2.7em] w-full shrink-0 overflow-hidden text-[11px] font-medium leading-[1.35] text-white/55 group-hover:text-white/80 sm:text-xs">
                Add achievement
              </p>
              <p className="text-[10px] text-white/35 sm:text-[11px]">—</p>
            </button>
          ) : null}

          {items.map((achievement) => (
            <AchievementGridItem
              key={achievement.id}
              title={achievement.title}
              dateLabel={achievement.dateLabel}
              iconUrl={achievement.iconUrl}
              FallbackIcon={achievement.FallbackIcon}
              tone={achievement.tone}
              isLocked={achievement.isLocked}
              onClick={() => onSelectAchievement(achievement.id)}
            />
          ))}
        </div>

        {items.length === 0 ? (
          <p className="mt-6 text-center text-sm text-white/45">
            {readOnly
              ? "No achievements to show yet."
              : "No achievements yet. Tap Add achievement to create one."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Grid container with built-in loading fallback. */
export function AchievementGrid({
  isLoading,
  readOnly,
  items,
  onAddAchievement,
  onSelectAchievement,
}: AchievementGridProps) {
  if (isLoading) return <AchievementGridFallback />;
  return (
    <AchievementGridInner
      readOnly={readOnly}
      items={items}
      onAddAchievement={onAddAchievement}
      onSelectAchievement={onSelectAchievement}
    />
  );
}
