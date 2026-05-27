import type { LucideIcon } from "lucide-react";

import {
  AchievementGridItem,
  AchievementGridItemAdd,
  AchievementGridItemDedicate,
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
  hasImpressions: boolean;
  showDedicatedGlitter: boolean;
};

type AchievementGridProps = {
  isLoading: boolean;
  readOnly: boolean;
  canDedicate?: boolean;
  items: AchievementGridEntry[];
  onAddAchievement: () => void;
  onDedicateAchievement?: () => void;
  onSelectAchievement: (id: string) => void;
};

const SKELETON_CELL_COUNT = 18;

function AchievementGridFallback() {
  return (
    <div>
      <div
        className={cn(
          "-mx-2 flex min-h-[calc(100dvh-9.5rem)] flex-col rounded-none bg-transparent px-2 pt-0 pb-4",
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
  canDedicate = false,
  items,
  onAddAchievement,
  onDedicateAchievement,
  onSelectAchievement,
}: Omit<AchievementGridProps, "isLoading">) {
  return (
    <div>
      <div
        className={cn(
          "-mx-2 min-h-[200px] rounded-none bg-transparent px-2 pt-0 pb-4",
          "sm:mx-0 sm:rounded-2xl sm:px-4",
        )}
      >
        <div className="grid grid-cols-3 gap-x-2 gap-y-8">
          {!readOnly ? (
            <AchievementGridItemAdd onClick={onAddAchievement} />
          ) : null}
          {canDedicate && onDedicateAchievement ? (
            <AchievementGridItemDedicate onClick={onDedicateAchievement} />
          ) : null}

          {items.map((achievement) => (
            <AchievementGridItem
              key={achievement.id}
              id={achievement.id}
              title={achievement.title}
              dateLabel={achievement.dateLabel}
              iconUrl={achievement.iconUrl}
              FallbackIcon={achievement.FallbackIcon}
              tone={achievement.tone}
              isLocked={achievement.isLocked}
              hasImpressions={achievement.hasImpressions}
              showDedicatedGlitter={achievement.showDedicatedGlitter}
              onClick={() => onSelectAchievement(achievement.id)}
            />
          ))}
        </div>

        {items.length === 0 ? (
          <p className="mx-auto mt-6 max-w-sm text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
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
  canDedicate,
  items,
  onAddAchievement,
  onDedicateAchievement,
  onSelectAchievement,
}: AchievementGridProps) {
  if (isLoading) return <AchievementGridFallback />;
  return (
    <AchievementGridInner
      readOnly={readOnly}
      canDedicate={canDedicate}
      items={items}
      onAddAchievement={onAddAchievement}
      onDedicateAchievement={onDedicateAchievement}
      onSelectAchievement={onSelectAchievement}
    />
  );
}
