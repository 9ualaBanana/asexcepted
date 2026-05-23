import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AchievementBadgeSlot } from "@/components/achievements/badge/achievement-badge-slot";
import { AchievementFallbackBadge } from "@/components/achievements/badge/achievement-fallback-badge";
import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import { getSafeTone } from "@/components/achievements/achievement-card";
import { getSafeIcon } from "@/components/achievements/achievement-editor-shared";
import { FeedActivityText } from "@/components/feed/feed-activity-text";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { formatFeedEventTimestamp } from "@/lib/feed/format-feed-event-time";
import type { FeedRow } from "@/lib/feed-db";
import { userAchievementDetail } from "@/lib/routes";
import { cn } from "@/lib/utils";

type FeedItemProps = {
  row: FeedRow;
};

export function FeedItem({ row }: FeedItemProps) {
  const href = userAchievementDetail(row.user_id, row.achievement_id);
  const tone = getSafeTone(row.tone);
  const FallbackIcon = getSafeIcon(row.icon);
  const isImpression = row.event_type === "impression";
  const eventTimeLabel = formatFeedEventTimestamp(row.event_at);
  const badgeSrc = row.icon_url?.trim()
    ? toOptimizedBadgeRenderSrc(row.icon_url.trim())
    : null;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4",
        "transition hover:bg-white/[0.06]",
        isImpression && "border-amber-200/15",
      )}
    >
      <div className="relative h-12 w-12 shrink-0">
        <AchievementBadgeSlot size="grid" className="max-w-12">
          {badgeSrc ? (
            <RemoteBadgeImage src={badgeSrc} />
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
        <FeedActivityText row={row} />
        {eventTimeLabel ? (
          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground/65">
            {eventTimeLabel}
          </p>
        ) : null}
      </div>

      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:text-muted-foreground/80"
        aria-hidden
      />
    </Link>
  );
}
