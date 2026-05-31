import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  BadgeSlot,
  FallbackBadge,
  DedicatedBadgeGlitter,
  RemoteBadgeImage,
} from "@/components/achievements/badge";
import { getSafeTone } from "@/components/achievements/achievement-manager-utils";
import { getSafeIcon } from "@/components/achievements/achievement-editor-shared";
import { FeedActivityText } from "@/components/feed/feed-activity-text";
import { ProfileAvatarSlot } from "@/components/profile/profile-avatar-slot";
import { isModelBadgeAssetKind } from "@/lib/achievements/badge-assets";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { formatFeedEventTimestamp } from "@/lib/feed/format-feed-event-time";
import {
  FEED_BADGE_PX,
  FEED_ROW_HEIGHT_CLASS,
} from "@/lib/feed/feed-row-layout";
import type { FeedRow } from "@/lib/feed-db";
import { userCollection } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { links } from "@/lib/notifications/templates";

/** Actor avatar as a fraction of badge width. */
const FEED_AVATAR_RATIO = 0.34;

type FeedItemProps = {
  row: FeedRow;
};

export function FeedItem({ row }: FeedItemProps) {
  const href = links.achievementDetail(row.user_id, row.achievement_id, row.event_type === "dedication");
  const actorHref = userCollection(row.actor_user_id);
  const tone = getSafeTone(row.tone);
  const FallbackIcon = getSafeIcon(row.icon);
  const isImpression = row.event_type === "impression";
  const isDedication = row.event_type === "dedication";
  const showDedicatedGlitter =
    row.is_dedicated &&
    !isModelBadgeAssetKind(row.icon_asset_kind) &&
    Boolean(row.icon_url?.trim());
  const eventTimeLabel = formatFeedEventTimestamp(row.event_at);
  const badgeSrc = row.icon_url?.trim()
    ? toOptimizedBadgeRenderSrc(row.icon_url.trim())
    : null;
  const avatarPx = Math.round(FEED_BADGE_PX * FEED_AVATAR_RATIO);

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
          <BadgeSlot
            size="grid"
            className="h-full w-full max-w-none"
          >
            <div className="relative h-full w-full">
              {badgeSrc ? (
                <RemoteBadgeImage src={badgeSrc} />
              ) : (
                <FallbackBadge
                  tone={tone}
                  isLocked={false}
                  FallbackIcon={FallbackIcon}
                  size="grid"
                />
              )}
              {showDedicatedGlitter && badgeSrc ? (
                <DedicatedBadgeGlitter
                  renderSrc={badgeSrc}
                  motionSeed={row.achievement_id}
                  className="z-[12]"
                />
              ) : null}
            </div>
          </BadgeSlot>
          <Link
            href={actorHref}
            aria-label={`Open ${row.actor_display_name || "profile"} profile`}
            className="pointer-events-auto absolute bottom-0 right-0 z-20 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ width: avatarPx, height: avatarPx }}
          >
            <ProfileAvatarSlot
              layout="feed-overlay"
              imageUrl={row.actor_avatar_url}
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
