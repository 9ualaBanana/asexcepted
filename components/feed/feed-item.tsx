import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AchievementBadgeSlot } from "@/components/achievements/badge/achievement-badge-slot";
import { AchievementFallbackBadge } from "@/components/achievements/badge/achievement-fallback-badge";
import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import { getSafeTone } from "@/components/achievements/achievement-card";
import { getSafeIcon } from "@/components/achievements/achievement-editor-shared";
import { FeedActivityText } from "@/components/feed/feed-activity-text";
import { ProfileAvatarSlot } from "@/components/profile/profile-avatar-slot";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { formatFeedEventTimestamp } from "@/lib/feed/format-feed-event-time";
import {
  FEED_BADGE_PX,
  FEED_ROW_HEIGHT_CLASS,
} from "@/lib/feed/feed-row-layout";
import type { FeedRow } from "@/lib/feed-db";
import { userAchievementDetail } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Actor avatar as a fraction of badge width. */
const FEED_AVATAR_RATIO = 0.34;

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
  const avatarPx = Math.round(FEED_BADGE_PX * FEED_AVATAR_RATIO);

  return (
    <Link
      href={href}
      className={cn(
        FEED_ROW_HEIGHT_CLASS,
        "group flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] py-2 pl-3.5 pr-3 sm:gap-3.5 sm:pl-4 sm:pr-3.5",
        "transition hover:border-white/15 hover:bg-white/[0.07]",
        isImpression && "border-amber-200/20 bg-amber-500/[0.04]",
      )}
    >
      <div className="flex h-full shrink-0 items-center justify-center pr-0.5">
        <div
          className="relative"
          style={{ width: FEED_BADGE_PX, height: FEED_BADGE_PX }}
        >
          <AchievementBadgeSlot
            size="grid"
            className="h-full w-full max-w-none"
          >
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
          <div
            className="pointer-events-none absolute bottom-0 right-0 z-10"
            style={{ width: avatarPx, height: avatarPx }}
          >
            <ProfileAvatarSlot
              layout="feed-overlay"
              imageUrl={row.actor_avatar_url}
              editable={false}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col justify-center overflow-hidden">
        <FeedActivityText row={row} />
        {eventTimeLabel ? (
          <p className="mt-px line-clamp-1 text-[10px] leading-none tabular-nums text-muted-foreground/65">
            {eventTimeLabel}
          </p>
        ) : null}
      </div>

      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/45 transition group-hover:text-muted-foreground/75"
        aria-hidden
      />
    </Link>
  );
}
