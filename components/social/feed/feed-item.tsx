"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/achievements/badge/display/badge";
import { badgeOptionsForFeedRow } from "@/components/achievements/badge/display/badge-presets";
import { FeedActivityText } from "@/components/social/feed/feed-activity-text";
import { ProfileAvatarSlot } from "@/components/profile/profile-avatar-slot";
import type { AchievementFeedItemViewModel } from "@/lib/achievements/presentation/surface-view-models";
import { formatFeedEventTimestamp } from "@/lib/feed/format-feed-event-time";
import {
  FEED_BADGE_PX,
  FEED_ROW_HEIGHT_CLASS,
} from "@/lib/feed/feed-row-layout";
import { userCollection } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { links } from "@/lib/notifications/templates";

/** Actor avatar as a fraction of badge width. */
const FEED_AVATAR_RATIO = 0.34;

type FeedItemProps = {
  row: AchievementFeedItemViewModel;
};

export function FeedItem({ row }: FeedItemProps) {
  const href = links.achievementDetail(
    row.userId,
    row.achievementId,
    row.eventType === "dedication",
  );
  const actorHref = userCollection(row.actorUserId);
  const isImpression = row.eventType === "impression";
  const isDedication = row.eventType === "dedication";
  const eventTimeLabel = formatFeedEventTimestamp(row.eventAt);
  const avatarPx = Math.round(FEED_BADGE_PX * FEED_AVATAR_RATIO);

  const badgeOptions = badgeOptionsForFeedRow({
    achievementId: row.achievementId,
    displaySrc: row.displaySrc,
    icon: row.icon,
    tone: row.tone,
    dedicatedEffect: row.showDedicatedEffect,
    frameClassName: "h-full w-full max-w-none",
  });

  return (
    <article
      className={cn(
        FEED_ROW_HEIGHT_CLASS,
        "group relative flex items-center gap-3 overflow-x-hidden overflow-y-visible rounded-2xl border border-white/10 bg-white/[0.04] py-2 pl-3.5 pr-11 sm:gap-4 sm:pl-4 sm:pr-12",
        "transition hover:border-white/15 hover:bg-white/[0.07]",
        isImpression && "border-amber-200/20 bg-amber-500/[0.04]",
        isDedication && "border-violet-200/20 bg-violet-500/[0.04]",
      )}
    >
      <Link
        href={href}
        aria-label="Open feed entry"
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      <div className="pointer-events-none relative z-10 flex h-full shrink-0 items-center justify-center pr-1">
        <div
          className="relative"
          style={{ width: FEED_BADGE_PX, height: FEED_BADGE_PX }}
        >
          <Badge options={badgeOptions} />
          <Link
            href={actorHref}
            aria-label={`Open ${row.actorDisplayName || "profile"} profile`}
            className="pointer-events-auto absolute bottom-0 right-0 z-20 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ width: avatarPx, height: avatarPx }}
          >
            <ProfileAvatarSlot
              layout="feed-overlay"
              imageUrl={row.actorAvatarUrl}
              editable={false}
              className="h-full w-full"
            />
          </Link>
        </div>
      </div>

      <div className="pointer-events-none relative z-10 flex h-full min-w-0 flex-1 flex-col justify-start overflow-visible pb-5 pt-2 pr-2">
        <FeedActivityText row={row} />
      </div>

      {eventTimeLabel ? (
        <p className="pointer-events-none absolute bottom-2.5 right-10 text-[10px] leading-none tabular-nums text-muted-foreground/65 sm:right-11">
          {eventTimeLabel}
        </p>
      ) : null}

      <ChevronRight
        className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground/45 transition group-hover:text-muted-foreground/75 sm:right-3.5"
        aria-hidden
      />
    </article>
  );
}
