import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AchievementBadgeSlot } from "@/components/achievements/badge/achievement-badge-slot";
import { AchievementFallbackBadge } from "@/components/achievements/badge/achievement-fallback-badge";
import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import { getSafeTone } from "@/components/achievements/achievement-card";
import {
  formatAchievedAt,
  getSafeIcon,
} from "@/components/achievements/achievement-editor-shared";
import type { FeedUnlockRow } from "@/lib/feed-db";
import { userAchievementDetail } from "@/lib/routes";
import { cn } from "@/lib/utils";

type FeedItemProps = {
  row: FeedUnlockRow;
};

export function FeedItem({ row }: FeedItemProps) {
  const dateLabel = formatAchievedAt(row.achieved_at);
  const href = userAchievementDetail(row.user_id, row.achievement_id);
  const tone = getSafeTone(row.tone);
  const FallbackIcon = getSafeIcon(row.icon);
  const title = row.title?.trim() || "Achievement";

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4",
        "transition hover:bg-white/[0.06]",
      )}
    >
      <div className="relative h-12 w-12 shrink-0">
        <AchievementBadgeSlot size="grid" className="max-w-12">
          {row.icon_url ? (
            <RemoteBadgeImage src={row.icon_url} />
          ) : (
            <AchievementFallbackBadge
              tone={tone}
              isLocked={false}
              FallbackIcon={FallbackIcon}
              size="grid"
            />
          )}
        </AchievementBadgeSlot>
      </div>

      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-foreground/95">
          {row.actor_display_name || "Someone"}
        </p>
        <p className="truncate text-xs text-muted-foreground/80">{title}</p>
        {dateLabel ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground/60">{dateLabel}</p>
        ) : null}
      </div>

      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-muted-foreground/80"
        aria-hidden
      />
    </Link>
  );
}
